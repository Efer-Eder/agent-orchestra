//! Read-only access to the authorized project folder.
//!
//! This is the security boundary for project files. Nothing here writes to
//! disk. Every path coming from the UI (and, indirectly, from a model) is
//! resolved against the canonical project root and must stay inside it after
//! symlinks and junctions are resolved. Sensitive files are never listed or
//! read, sizes are capped, binaries are skipped and secrets found inside text
//! files are redacted before the content leaves Rust.

use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::LazyLock;

use regex::Regex;
use serde::Serialize;

/// Limits. Generous enough for real context, small enough for a prompt.
pub const MAX_LIST: usize = 3000;
pub const MAX_DEPTH: usize = 12;
pub const MAX_READ_FILES: usize = 12;
pub const MAX_FILE_BYTES: usize = 64 * 1024;
pub const MAX_TOTAL_BYTES: usize = 200 * 1024;

/// Error returned to the frontend: a stable code plus a short detail that never
/// contains file contents.
#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct FsError {
    pub code: &'static str,
    pub detail: String,
}

impl FsError {
    fn new(code: &'static str, detail: impl Into<String>) -> Self {
        Self {
            code,
            detail: detail.into(),
        }
    }
}

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct FileList {
    pub root: String,
    pub files: Vec<String>,
    pub truncated: bool,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub bytes: usize,
    pub truncated: bool,
    pub redactions: usize,
    /// Set when the file was not read (`denied`, `outside`, `missing`, `binary`, `budget`).
    pub skipped: Option<&'static str>,
}

// ------------------------------------------------------------------ policy

/// Directories never walked into.
const DENIED_DIRS: &[&str] = &[
    ".git",
    ".svn",
    ".hg",
    ".ssh",
    ".gnupg",
    ".aws",
    ".azure",
    ".kube",
    ".docker",
    ".idea",
    ".vscode",
    ".next",
    ".nuxt",
    ".cache",
    ".venv",
    "venv",
    "env",
    "node_modules",
    "target",
    "dist",
    "dist-site",
    "build",
    "out",
    "coverage",
    "__pycache__",
    ".terraform",
    "bower_components",
];

/// Exact file names never read (lowercase).
const DENIED_FILES: &[&str] = &[
    ".env",
    ".npmrc",
    ".yarnrc",
    ".netrc",
    ".pypirc",
    ".git-credentials",
    ".htpasswd",
    ".pgpass",
    "id_rsa",
    "id_dsa",
    "id_ecdsa",
    "id_ed25519",
    "known_hosts",
    "authorized_keys",
    "credentials",
    "credentials.json",
    "secrets.json",
    "secrets.yml",
    "secrets.yaml",
    "service-account.json",
    "keystore.properties",
    "local.properties",
];

/// File extensions never read (lowercase, without the dot).
const DENIED_EXTENSIONS: &[&str] = &[
    "pem", "key", "p12", "pfx", "jks", "keystore", "kdbx", "ppk", "der", "gpg", "asc", "ovpn",
    "sqlite", "sqlite3", "db",
];

/// `.env.example`-style templates are fine to read.
const ALLOWED_ENV_TEMPLATES: &[&str] = &[".env.example", ".env.sample", ".env.template"];

fn is_denied_dir(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    DENIED_DIRS.contains(&lower.as_str()) || (lower.starts_with('.') && lower != ".github")
}

fn is_denied_file(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    if ALLOWED_ENV_TEMPLATES.contains(&lower.as_str()) {
        return false;
    }
    if DENIED_FILES.contains(&lower.as_str()) || lower.starts_with(".env.") {
        return true;
    }
    if lower.starts_with("id_rsa") || lower.starts_with("id_ed25519") {
        return true;
    }
    match lower.rsplit_once('.') {
        Some((_, ext)) => DENIED_EXTENSIONS.contains(&ext),
        None => false,
    }
}

// ------------------------------------------------------------------ root

fn display(path: &Path) -> String {
    let s = path.to_string_lossy();
    s.strip_prefix(r"\\?\").unwrap_or(&s).to_string()
}

fn same_or_inside(path: &Path, base: &Path) -> bool {
    path.starts_with(base)
}

/// Folders that can never be a project root.
fn forbidden_roots() -> Vec<PathBuf> {
    let mut v = Vec::new();
    for var in [
        "SystemRoot",
        "windir",
        "ProgramFiles",
        "ProgramFiles(x86)",
        "ProgramData",
    ] {
        if let Ok(p) = std::env::var(var)
            && let Ok(c) = fs::canonicalize(p)
        {
            v.push(c);
        }
    }
    v
}

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE")
        .or_else(|| std::env::var_os("HOME"))
        .and_then(|h| fs::canonicalize(h).ok())
}

/// Validates the folder the user authorized and returns its canonical path.
pub fn check_root(root: &str) -> Result<PathBuf, FsError> {
    let trimmed = root.trim();
    if trimmed.is_empty() {
        return Err(FsError::new("root_missing", "empty"));
    }
    let canon = fs::canonicalize(trimmed).map_err(|_| FsError::new("root_missing", trimmed))?;
    if !canon.is_dir() {
        return Err(FsError::new("root_not_dir", display(&canon)));
    }
    let normal_parts = canon
        .components()
        .filter(|c| matches!(c, Component::Normal(_)))
        .count();
    if normal_parts < 2 {
        // Drive roots (C:\) and top-level folders (C:\Users) are too broad.
        return Err(FsError::new("root_too_broad", display(&canon)));
    }
    if home_dir().is_some_and(|h| h == canon) {
        return Err(FsError::new("root_too_broad", display(&canon)));
    }
    for forbidden in forbidden_roots() {
        if same_or_inside(&canon, &forbidden) {
            return Err(FsError::new("root_system", display(&canon)));
        }
    }
    Ok(canon)
}

// ------------------------------------------------------------------ list

pub fn list_files(root: &str) -> Result<FileList, FsError> {
    let base = check_root(root)?;
    let mut files = Vec::new();
    let mut truncated = false;
    let mut stack = vec![(base.clone(), 0usize)];
    while let Some((dir, depth)) = stack.pop() {
        let Ok(entries) = fs::read_dir(&dir) else {
            continue;
        };
        for entry in entries.flatten() {
            let Ok(meta) = entry.path().symlink_metadata() else {
                continue;
            };
            // Never follow links: they could point anywhere.
            if meta.file_type().is_symlink() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if meta.is_dir() {
                if !is_denied_dir(&name) && depth < MAX_DEPTH {
                    stack.push((entry.path(), depth + 1));
                }
            } else if meta.is_file() && !is_denied_file(&name) {
                if files.len() >= MAX_LIST {
                    truncated = true;
                    break;
                }
                if let Ok(rel) = entry.path().strip_prefix(&base) {
                    files.push(rel.to_string_lossy().replace('\\', "/"));
                }
            }
        }
        if truncated {
            break;
        }
    }
    files.sort();
    Ok(FileList {
        root: display(&base),
        files,
        truncated,
    })
}

// ------------------------------------------------------------------ read

/// Resolves a relative path inside `base`. Rejects absolute paths, `..`,
/// drive prefixes, denied names and anything that escapes after resolving
/// symlinks or junctions.
pub fn resolve_inside(base: &Path, rel: &str) -> Result<PathBuf, &'static str> {
    let rel = rel.trim().replace('\\', "/");
    if rel.is_empty() || rel.contains('\0') {
        return Err("outside");
    }
    let candidate = Path::new(&rel);
    let mut parts = Vec::new();
    for c in candidate.components() {
        match c {
            Component::Normal(p) => parts.push(p.to_string_lossy().to_string()),
            Component::CurDir => {}
            _ => return Err("outside"),
        }
    }
    let Some((file, dirs)) = parts.split_last() else {
        return Err("outside");
    };
    if dirs.iter().any(|d| is_denied_dir(d)) || is_denied_file(file) {
        return Err("denied");
    }
    let joined = parts.iter().fold(base.to_path_buf(), |acc, p| acc.join(p));
    let canon = fs::canonicalize(&joined).map_err(|_| "missing")?;
    if !same_or_inside(&canon, base) {
        return Err("outside");
    }
    if !canon.is_file() {
        return Err("missing");
    }
    // The resolved target must not be a denied file either (e.g. a link to .env).
    if let Some(name) = canon.file_name()
        && is_denied_file(&name.to_string_lossy())
    {
        return Err("denied");
    }
    Ok(canon)
}

static PRIVATE_KEY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?s)-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----.*?-----END [A-Z0-9 ]*PRIVATE KEY-----")
        .unwrap()
});
static TOKENS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(concat!(
        r"\b(?:sk-(?:proj-|ant-)?[A-Za-z0-9_\-]{16,}",
        r"|sk_(?:live|test)_[A-Za-z0-9]{16,}",
        r"|gh[pousr]_[A-Za-z0-9]{30,}",
        r"|github_pat_[A-Za-z0-9_]{30,}",
        r"|AKIA[0-9A-Z]{16}",
        r"|xox[abprs]-[A-Za-z0-9\-]{10,}",
        r"|AIza[0-9A-Za-z_\-]{35}",
        r"|eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,})"
    ))
    .unwrap()
});
/// `api_key = "value"` / `password: 'value'`: only quoted values, so type
/// annotations such as `password: string` are left alone.
static QUOTED_ASSIGNMENTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?i)\b((?:api[_-]?key|secret|token|passwd|password|client[_-]?secret|access[_-]?key)[A-Za-z0-9_]*\s*[:=]\s*)("[^"\n]{6,}"|'[^'\n]{6,}')"#,
    )
    .unwrap()
});
/// `.env`-style lines: `DB_PASSWORD=value`, `export API_KEY=value`.
static ENV_ASSIGNMENTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?m)^(\s*(?:export\s+)?[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD)[A-Z0-9_]*\s*=\s*)([^\s#]{6,})",
    )
    .unwrap()
});

/// Replaces likely secrets with `[REDACTED]`. Returns the text and how many
/// replacements were made.
pub fn redact(text: &str) -> (String, usize) {
    let mut count = 0;
    let step1 = PRIVATE_KEY.replace_all(text, |_: &regex::Captures| {
        count += 1;
        "[REDACTED PRIVATE KEY]".to_string()
    });
    let step2 = TOKENS.replace_all(&step1, |_: &regex::Captures| {
        count += 1;
        "[REDACTED]".to_string()
    });
    let step3 = QUOTED_ASSIGNMENTS.replace_all(&step2, |c: &regex::Captures| {
        count += 1;
        format!("{}\"[REDACTED]\"", &c[1])
    });
    let step4 = ENV_ASSIGNMENTS.replace_all(&step3, |c: &regex::Captures| {
        count += 1;
        format!("{}[REDACTED]", &c[1])
    });
    (step4.into_owned(), count)
}

fn skipped(path: &str, reason: &'static str) -> FileContent {
    FileContent {
        path: path.to_string(),
        content: String::new(),
        bytes: 0,
        truncated: false,
        redactions: 0,
        skipped: Some(reason),
    }
}

pub fn read_files(root: &str, paths: &[String]) -> Result<Vec<FileContent>, FsError> {
    let base = check_root(root)?;
    let mut out = Vec::new();
    let mut total = 0usize;
    for rel in paths.iter().take(MAX_READ_FILES) {
        let canon = match resolve_inside(&base, rel) {
            Ok(p) => p,
            Err(reason) => {
                out.push(skipped(rel, reason));
                continue;
            }
        };
        if total >= MAX_TOTAL_BYTES {
            out.push(skipped(rel, "budget"));
            continue;
        }
        let Ok(raw) = fs::read(&canon) else {
            out.push(skipped(rel, "missing"));
            continue;
        };
        if raw.iter().take(8192).any(|b| *b == 0) {
            out.push(skipped(rel, "binary"));
            continue;
        }
        let budget = MAX_FILE_BYTES.min(MAX_TOTAL_BYTES - total);
        let truncated = raw.len() > budget;
        let slice = &raw[..raw.len().min(budget)];
        let text = String::from_utf8_lossy(slice);
        let (content, redactions) = redact(&text);
        total += slice.len();
        out.push(FileContent {
            path: rel.trim().replace('\\', "/"),
            content,
            bytes: raw.len(),
            truncated,
            redactions,
            skipped: None,
        });
    }
    Ok(out)
}

// ------------------------------------------------------------------ commands

#[tauri::command]
pub fn project_check_root(root: String) -> Result<String, FsError> {
    check_root(&root).map(|p| display(&p))
}

#[tauri::command]
pub fn project_list_files(root: String) -> Result<FileList, FsError> {
    list_files(&root)
}

/// What reading these files would give, without the contents: the contents are
/// only read again in Rust when the Builder's prompt is assembled.
#[tauri::command]
pub fn project_inspect_files(
    root: String,
    paths: Vec<String>,
) -> Result<Vec<crate::provider_http::FileMeta>, FsError> {
    Ok(read_files(&root, &paths)?
        .iter()
        .map(crate::provider_http::FileMeta::from)
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn project() -> tempfile::TempDir {
        let dir = tempfile::Builder::new()
            .prefix("ao-proj")
            .tempdir()
            .unwrap();
        let p = dir.path();
        fs::create_dir_all(p.join("src/app")).unwrap();
        fs::create_dir_all(p.join("node_modules/lib")).unwrap();
        fs::create_dir_all(p.join(".git")).unwrap();
        fs::create_dir_all(p.join(".github/workflows")).unwrap();
        fs::write(p.join("README.md"), "# Demo\n").unwrap();
        fs::write(p.join("package.json"), "{\"name\":\"demo\"}\n").unwrap();
        fs::write(p.join("src/app/main.ts"), "export const x = 1;\n").unwrap();
        fs::write(p.join("node_modules/lib/index.js"), "x").unwrap();
        fs::write(p.join(".git/config"), "x").unwrap();
        fs::write(p.join(".github/workflows/ci.yml"), "on: push\n").unwrap();
        fs::write(p.join(".env"), "API_KEY=supersecretvalue\n").unwrap();
        fs::write(p.join(".env.local"), "X=1\n").unwrap();
        fs::write(p.join(".env.example"), "API_KEY=\n").unwrap();
        fs::write(p.join("server.pem"), "x").unwrap();
        fs::write(p.join("logo.png"), [0x89, b'P', b'N', b'G', 0, 0, 1]).unwrap();
        dir
    }

    fn root(d: &tempfile::TempDir) -> String {
        d.path().to_string_lossy().to_string()
    }

    #[test]
    fn lists_only_allowed_files() {
        let d = project();
        let list = list_files(&root(&d)).unwrap();
        assert_eq!(
            list.files,
            vec![
                ".env.example",
                ".github/workflows/ci.yml",
                "README.md",
                "logo.png",
                "package.json",
                "src/app/main.ts",
            ]
        );
        assert!(!list.truncated);
    }

    #[test]
    fn rejects_broad_or_missing_roots() {
        assert_eq!(check_root("").unwrap_err().code, "root_missing");
        assert_eq!(
            check_root("Z:/definitely/not/here").unwrap_err().code,
            "root_missing"
        );
        #[cfg(windows)]
        {
            assert_eq!(check_root("C:\\").unwrap_err().code, "root_too_broad");
            if let Ok(windir) = std::env::var("SystemRoot") {
                let code = check_root(&format!("{windir}\\System32")).unwrap_err().code;
                assert_eq!(code, "root_system");
            }
        }
        if let Some(home) = home_dir() {
            assert_eq!(
                check_root(&home.to_string_lossy()).unwrap_err().code,
                "root_too_broad"
            );
        }
    }

    #[test]
    fn reads_text_and_reports_why_others_are_skipped() {
        let d = project();
        let paths: Vec<String> = [
            "README.md",
            "src\\app\\main.ts",
            "../outside.txt",
            "/etc/passwd",
            "C:/Windows/win.ini",
            ".env",
            "server.pem",
            "node_modules/lib/index.js",
            "logo.png",
            "nope.md",
        ]
        .iter()
        .map(|s| s.to_string())
        .collect();
        let out = read_files(&root(&d), &paths).unwrap();
        let reasons: Vec<(&str, Option<&str>)> =
            out.iter().map(|f| (f.path.as_str(), f.skipped)).collect();
        assert_eq!(
            reasons,
            vec![
                ("README.md", None),
                ("src/app/main.ts", None),
                ("../outside.txt", Some("outside")),
                ("/etc/passwd", Some("outside")),
                ("C:/Windows/win.ini", Some("outside")),
                (".env", Some("denied")),
                ("server.pem", Some("denied")),
                ("node_modules/lib/index.js", Some("denied")),
                ("logo.png", Some("binary")),
                ("nope.md", Some("missing")),
            ]
        );
        assert_eq!(out[0].content, "# Demo\n");
    }

    #[test]
    fn caps_size_and_file_count() {
        let d = project();
        let big = "a".repeat(MAX_FILE_BYTES + 100);
        fs::write(d.path().join("big.txt"), &big).unwrap();
        let out = read_files(&root(&d), &["big.txt".to_string()]).unwrap();
        assert!(out[0].truncated);
        assert_eq!(out[0].content.len(), MAX_FILE_BYTES);
        assert_eq!(out[0].bytes, big.len());

        let many: Vec<String> = (0..20).map(|_| "README.md".to_string()).collect();
        assert_eq!(read_files(&root(&d), &many).unwrap().len(), MAX_READ_FILES);
    }

    #[test]
    fn redacts_secrets_inside_files() {
        // Fake secrets are assembled at runtime so the source never contains a
        // string that looks like a real credential (secret scanners would flag it).
        let aws = format!("{}{}", "AKIA", "ABCDEFGHIJKLMNOP");
        let pem = format!("-----BEGIN RSA {}-----", "PRIVATE KEY");
        let pem_end = format!("-----END RSA {}-----", "PRIVATE KEY");
        let text = format!(
            "const key = 'sk-proj-{}';\nAWS={aws}\npassword: \"hunter2hunter2\"\nDB_PASSWORD=correcthorsebattery\n{pem}\nMIIBOgIBAAJ\n{pem_end}\nfunction login(email: string, password: string) {{}}\nharmless = 42\n",
            "abcdefghijklmnopqrstuvwx"
        );
        let (out, n) = redact(&text);
        assert_eq!(n, 5);
        assert!(!out.contains("correcthorsebattery"));
        // Type annotations are not secrets.
        assert!(out.contains("function login(email: string, password: string) {}"));
        assert!(!out.contains("sk-proj-abcdefghijklmnop"));
        assert!(!out.contains(&aws));
        assert!(!out.contains("hunter2hunter2"));
        assert!(!out.contains("MIIBOgIBAAJ"));
        assert!(out.contains("harmless = 42"));
    }

    #[cfg(windows)]
    #[test]
    fn junction_escape_is_refused() {
        let d = project();
        let outside = tempfile::tempdir().unwrap();
        fs::write(outside.path().join("secret.txt"), "top secret").unwrap();
        let link = d.path().join("linked");
        // Junctions do not need admin rights on Windows.
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
        let out = read_files(&root(&d), &["linked/secret.txt".to_string()]).unwrap();
        assert_eq!(out[0].skipped, Some("outside"));
        assert!(
            !list_files(&root(&d))
                .unwrap()
                .files
                .iter()
                .any(|f| f.contains("secret"))
        );
    }
}
