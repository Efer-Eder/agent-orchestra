//! Writing approved changes to disk.
//!
//! Only runs for files the person ticked, one by one, after the final approval.
//! Every path goes through the same rules as reading (`project_fs`): relative,
//! inside the authorized folder, no denied names. On top of that nothing is
//! written through a symlink or junction, a "modify" hunk must match the file
//! as it is now (no blind overwrite), "create" never replaces an existing file,
//! and "delete" only removes a file whose whole content matches the diff.
//! Each file is written to a temporary file next to it and then renamed, so a
//! failure never leaves a half-written file. Each file succeeds or fails alone.

use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::project_fs::{self, FsError};

pub const MAX_CHANGES: usize = 50;
pub const MAX_DIFF_BYTES: usize = 512 * 1024;
pub const MAX_RESULT_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Clone, Deserialize)]
pub struct ApplyChange {
    pub path: String,
    /// create, modify or delete
    pub kind: String,
    pub diff: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ApplyResult {
    pub path: String,
    /// applied or failed
    pub status: &'static str,
    /// outside, denied, symlink, exists, missing, conflict, bad_diff, too_big, io
    pub reason: Option<&'static str>,
}

// ------------------------------------------------------------------ diff

#[derive(Debug, PartialEq, Eq)]
struct Hunk {
    old_start: usize,
    /// (' ' | '-' | '+', text)
    lines: Vec<(char, String)>,
}

fn parse_header(line: &str) -> Option<usize> {
    // @@ -12,3 +12,4 @@ optional section
    let rest = line.strip_prefix("@@ -")?;
    let old = rest.split_whitespace().next()?;
    old.split(',').next()?.parse().ok()
}

fn parse_hunks(diff: &str) -> Result<Vec<Hunk>, &'static str> {
    let mut hunks: Vec<Hunk> = Vec::new();
    for raw in diff.lines() {
        let line = raw.strip_suffix('\r').unwrap_or(raw);
        if line.starts_with("@@") {
            hunks.push(Hunk {
                old_start: parse_header(line).ok_or("bad_diff")?,
                lines: Vec::new(),
            });
            continue;
        }
        let Some(hunk) = hunks.last_mut() else {
            continue; // headers (---, +++, diff --git, index) before the first hunk
        };
        if line.starts_with('\\') {
            continue; // "\ No newline at end of file"
        }
        let mut chars = line.chars();
        match chars.next() {
            Some(c @ (' ' | '-' | '+')) => hunk.lines.push((c, chars.as_str().to_string())),
            None => hunk.lines.push((' ', String::new())),
            _ => return Err("bad_diff"),
        }
    }
    Ok(hunks)
}

fn old_block(h: &Hunk) -> Vec<&str> {
    h.lines
        .iter()
        .filter(|(c, _)| *c != '+')
        .map(|(_, t)| t.as_str())
        .collect()
}

fn new_block(h: &Hunk) -> Vec<String> {
    h.lines
        .iter()
        .filter(|(c, _)| *c != '-')
        .map(|(_, t)| t.clone())
        .collect()
}

fn matches_at(lines: &[String], at: usize, block: &[&str]) -> bool {
    at + block.len() <= lines.len() && block.iter().enumerate().all(|(i, b)| lines[at + i] == *b)
}

/// Applies the hunks to `original`. Each hunk's context and removed lines must
/// be found in the file (near the stated line first); otherwise it is a conflict.
pub fn apply_hunks(original: &str, diff: &str) -> Result<String, &'static str> {
    let hunks = parse_hunks(diff)?;
    if hunks.is_empty() {
        return Err("bad_diff");
    }
    let crlf = original.contains("\r\n");
    let trailing_newline = original.is_empty() || original.ends_with('\n');
    let mut lines: Vec<String> = original
        .lines()
        .map(|l| l.strip_suffix('\r').unwrap_or(l).to_string())
        .collect();
    let mut offset: isize = 0;
    for h in &hunks {
        let old = old_block(h);
        let new = new_block(h);
        let expected = if old.is_empty() {
            // Pure insertion: "-N,0" means after line N.
            h.old_start
        } else {
            h.old_start.saturating_sub(1)
        };
        let expected = (expected as isize + offset).clamp(0, lines.len() as isize) as usize;
        let at = if old.is_empty() {
            expected
        } else {
            // Nearest match to the expected line, searching both ways.
            (0..=lines.len())
                .flat_map(|d| [expected.checked_add(d), expected.checked_sub(d)])
                .flatten()
                .find(|&i| matches_at(&lines, i, &old))
                .ok_or("conflict")?
        };
        lines.splice(at..at + old.len(), new.iter().cloned());
        offset += new.len() as isize - old.len() as isize;
        offset += at as isize - expected as isize;
    }
    let eol = if crlf { "\r\n" } else { "\n" };
    let mut out = lines.join(eol);
    if trailing_newline && !out.is_empty() {
        out.push_str(eol);
    }
    Ok(out)
}

/// Content of a new file: the added lines of its hunks.
fn created_content(diff: &str) -> Result<String, &'static str> {
    let hunks = parse_hunks(diff)?;
    if hunks.is_empty() || hunks.iter().any(|h| h.lines.iter().any(|(c, _)| *c != '+')) {
        return Err("bad_diff");
    }
    let lines: Vec<String> = hunks.iter().flat_map(new_block).collect();
    Ok(format!("{}\n", lines.join("\n")))
}

// ------------------------------------------------------------------ paths

fn is_link(path: &Path) -> bool {
    path.symlink_metadata()
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
}

/// Resolves where to write. Same rules as reading, plus: no symlink or junction
/// anywhere on the way, and the final folder must canonicalize inside the root.
fn resolve_for_write(base: &Path, rel: &str) -> Result<PathBuf, &'static str> {
    let rel = rel.trim().replace('\\', "/");
    if rel.is_empty() || rel.contains('\0') {
        return Err("outside");
    }
    let mut parts = Vec::new();
    for c in Path::new(&rel).components() {
        match c {
            Component::Normal(p) => parts.push(p.to_string_lossy().to_string()),
            Component::CurDir => {}
            _ => return Err("outside"),
        }
    }
    let Some((file, dirs)) = parts.split_last() else {
        return Err("outside");
    };
    if dirs.iter().any(|d| project_fs::is_denied_dir(d)) || project_fs::is_denied_file(file) {
        return Err("denied");
    }
    let mut current = base.to_path_buf();
    for d in dirs {
        current.push(d);
        if is_link(&current) {
            return Err("symlink");
        }
    }
    let target = current.join(file);
    if is_link(&target) {
        return Err("symlink");
    }
    Ok(target)
}

/// After creating missing folders, the real folder must still be inside the root.
fn check_parent_inside(base: &Path, target: &Path) -> Result<(), &'static str> {
    let parent = target.parent().ok_or("outside")?;
    let canon = fs::canonicalize(parent).map_err(|_| "io")?;
    if project_fs::same_or_inside(&canon, base) {
        Ok(())
    } else {
        Err("outside")
    }
}

fn write_atomic(target: &Path, content: &str) -> Result<(), &'static str> {
    if content.len() > MAX_RESULT_BYTES {
        return Err("too_big");
    }
    let name = target.file_name().ok_or("io")?.to_string_lossy();
    let tmp = target.with_file_name(format!(".{name}.agent-orchestra.tmp"));
    fs::write(&tmp, content).map_err(|_| "io")?;
    fs::rename(&tmp, target).map_err(|_| {
        let _ = fs::remove_file(&tmp);
        "io"
    })
}

fn apply_one(base: &Path, change: &ApplyChange) -> Result<(), &'static str> {
    if change.diff.len() > MAX_DIFF_BYTES {
        return Err("too_big");
    }
    let target = resolve_for_write(base, &change.path)?;
    match change.kind.as_str() {
        "create" => {
            let content = created_content(&change.diff)?;
            if target.symlink_metadata().is_ok() {
                return Err("exists");
            }
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent).map_err(|_| "io")?;
            }
            check_parent_inside(base, &target)?;
            write_atomic(&target, &content)
        }
        "modify" => {
            if !target.is_file() {
                return Err("missing");
            }
            check_parent_inside(base, &target)?;
            let original = fs::read_to_string(&target).map_err(|_| "io")?;
            let updated = apply_hunks(&original, &change.diff)?;
            write_atomic(&target, &updated)
        }
        "delete" => {
            if !target.is_file() {
                return Err("missing");
            }
            check_parent_inside(base, &target)?;
            let original = fs::read_to_string(&target).map_err(|_| "io")?;
            // Removing every line the diff lists must leave nothing behind.
            if apply_hunks(&original, &change.diff)?.trim().is_empty() {
                fs::remove_file(&target).map_err(|_| "io")
            } else {
                Err("conflict")
            }
        }
        _ => Err("bad_diff"),
    }
}

pub fn apply_changes(root: &str, changes: &[ApplyChange]) -> Result<Vec<ApplyResult>, FsError> {
    let base = project_fs::check_root(root)?;
    Ok(changes
        .iter()
        .take(MAX_CHANGES)
        .map(|c| {
            let result = apply_one(&base, c);
            ApplyResult {
                path: c.path.trim().replace('\\', "/"),
                status: if result.is_ok() { "applied" } else { "failed" },
                reason: result.err(),
            }
        })
        .collect())
}

/// Writes the changes the person approved, file by file.
#[tauri::command]
pub fn project_apply_changes(
    root: String,
    changes: Vec<ApplyChange>,
) -> Result<Vec<ApplyResult>, FsError> {
    apply_changes(&root, &changes)
}

// ------------------------------------------------------------------ tests

#[cfg(test)]
mod tests {
    use super::*;

    fn project() -> tempfile::TempDir {
        let d = tempfile::tempdir().unwrap();
        fs::create_dir_all(d.path().join("src")).unwrap();
        fs::write(
            d.path().join("src/app.ts"),
            "import x from 'x';\n\nexport function run() {\n  return 1;\n}\n",
        )
        .unwrap();
        d
    }

    fn root(d: &tempfile::TempDir) -> String {
        d.path().to_string_lossy().into_owned()
    }

    fn change(path: &str, kind: &str, diff: &str) -> ApplyChange {
        ApplyChange {
            path: path.into(),
            kind: kind.into(),
            diff: diff.into(),
        }
    }

    fn one(d: &tempfile::TempDir, c: ApplyChange) -> ApplyResult {
        apply_changes(&root(d), &[c]).unwrap().remove(0)
    }

    #[test]
    fn modifies_with_context_and_keeps_line_endings() {
        let d = project();
        let r = one(
            &d,
            change(
                "src/app.ts",
                "modify",
                "--- a/src/app.ts\n+++ b/src/app.ts\n@@ -3,3 +3,3 @@\n export function run() {\n-  return 1;\n+  return 2;\n }\n",
            ),
        );
        assert_eq!(r.status, "applied", "{r:?}");
        let text = fs::read_to_string(d.path().join("src/app.ts")).unwrap();
        assert!(text.contains("return 2;") && !text.contains("return 1;"));

        fs::write(d.path().join("crlf.txt"), "a\r\nb\r\n").unwrap();
        let r = one(&d, change("crlf.txt", "modify", "@@ -0,0 +1 @@\n+top\n"));
        assert_eq!(r.status, "applied");
        assert_eq!(
            fs::read_to_string(d.path().join("crlf.txt")).unwrap(),
            "top\r\na\r\nb\r\n"
        );
    }

    #[test]
    fn refuses_a_modify_that_does_not_match_the_file() {
        let d = project();
        let r = one(
            &d,
            change(
                "src/app.ts",
                "modify",
                "@@ -4,1 +4,1 @@\n-  return 999;\n+  return 2;\n",
            ),
        );
        assert_eq!(r.reason, Some("conflict"));
        assert!(
            fs::read_to_string(d.path().join("src/app.ts"))
                .unwrap()
                .contains("return 1;")
        );
    }

    #[test]
    fn finds_hunks_that_moved() {
        let d = project();
        // Stated line is wrong by two; the context still matches nearby.
        let r = one(
            &d,
            change(
                "src/app.ts",
                "modify",
                "@@ -1,1 +1,1 @@\n-  return 1;\n+  return 3;\n",
            ),
        );
        assert_eq!(r.status, "applied");
    }

    #[test]
    fn creates_new_files_and_folders_but_never_overwrites() {
        let d = project();
        let diff = "--- /dev/null\n+++ b/docs/new.md\n@@ -0,0 +1,2 @@\n+# Title\n+body\n";
        assert_eq!(
            one(&d, change("docs/new.md", "create", diff)).status,
            "applied"
        );
        assert_eq!(
            fs::read_to_string(d.path().join("docs/new.md")).unwrap(),
            "# Title\nbody\n"
        );
        assert_eq!(
            one(&d, change("src/app.ts", "create", "@@ -0,0 +1 @@\n+x\n")).reason,
            Some("exists")
        );
    }

    #[test]
    fn deletes_only_when_the_diff_covers_the_whole_file() {
        let d = project();
        fs::write(d.path().join("old.txt"), "a\nb\n").unwrap();
        assert_eq!(
            one(&d, change("old.txt", "delete", "@@ -1,2 +0,0 @@\n-a\n")).reason,
            Some("conflict")
        );
        assert!(d.path().join("old.txt").exists());
        assert_eq!(
            one(&d, change("old.txt", "delete", "@@ -1,2 +0,0 @@\n-a\n-b\n")).status,
            "applied"
        );
        assert!(!d.path().join("old.txt").exists());
    }

    #[test]
    fn refuses_traversal_absolute_and_denied_paths() {
        let d = project();
        let outside = d.path().parent().unwrap().join("escaped.txt");
        for path in [
            "../escaped.txt",
            "src/../../escaped.txt",
            "C:/Windows/evil.txt",
            "/etc/passwd",
            "\\\\server\\share\\x.txt",
        ] {
            let r = one(&d, change(path, "create", "@@ -0,0 +1 @@\n+x\n"));
            assert_eq!(r.status, "failed", "{path}");
            assert_eq!(r.reason, Some("outside"), "{path}");
        }
        assert!(!outside.exists());
        for path in [
            ".env",
            "node_modules/x.js",
            ".git/config",
            "keys/server.pem",
        ] {
            let r = one(&d, change(path, "create", "@@ -0,0 +1 @@\n+x\n"));
            assert_eq!(r.reason, Some("denied"), "{path}");
        }
    }

    #[cfg(windows)]
    #[test]
    fn never_writes_through_a_junction() {
        let d = project();
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("target.txt"), "keep\n").unwrap();
        let link = d.path().join("linked");
        let ok = std::process::Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(&link)
            .arg(outside.path())
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if !ok {
            eprintln!("skipping: could not create junction");
            return;
        }
        let r = one(
            &d,
            change(
                "linked/target.txt",
                "modify",
                "@@ -1 +1 @@\n-keep\n+changed\n",
            ),
        );
        assert_eq!(r.reason, Some("symlink"));
        let r = one(
            &d,
            change("linked/new.txt", "create", "@@ -0,0 +1 @@\n+x\n"),
        );
        assert_eq!(r.reason, Some("symlink"));
        assert_eq!(
            fs::read_to_string(outside.path().join("target.txt")).unwrap(),
            "keep\n"
        );
        assert!(!outside.path().join("new.txt").exists());
    }

    #[test]
    fn each_file_succeeds_or_fails_alone() {
        let d = project();
        let results = apply_changes(
            &root(&d),
            &[
                change("../x.txt", "create", "@@ -0,0 +1 @@\n+x\n"),
                change("ok.txt", "create", "@@ -0,0 +1 @@\n+ok\n"),
                change("src/app.ts", "rename", ""),
            ],
        )
        .unwrap();
        let statuses: Vec<_> = results.iter().map(|r| (r.status, r.reason)).collect();
        assert_eq!(
            statuses,
            vec![
                ("failed", Some("outside")),
                ("applied", None),
                ("failed", Some("bad_diff"))
            ]
        );
        // No temporary files are left behind.
        let leftovers = fs::read_dir(d.path())
            .unwrap()
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().ends_with(".tmp"))
            .count();
        assert_eq!(leftovers, 0);
    }

    #[test]
    fn parses_hunks() {
        assert_eq!(
            apply_hunks("a\nb\nc\n", "@@ -2,1 +2,2 @@\n b\n+b2\n").unwrap(),
            "a\nb\nb2\nc\n"
        );
        assert_eq!(apply_hunks("a\n", "no hunks"), Err("bad_diff"));
        assert_eq!(apply_hunks("a\n", "@@ -1 +1 @@\n?bad\n"), Err("bad_diff"));
    }
}
