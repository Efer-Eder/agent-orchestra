import type { ContextFile, ProposedChange } from '../domain/types.ts';
import { isDesktop } from './secrets.ts';

/**
 * Bridge to the read-only project commands in `src-tauri/src/project_fs.rs`.
 * All path checks happen in Rust; this file only forwards calls. Desktop only.
 */

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

export type ProjectFsCode =
  'root_missing' | 'root_not_dir' | 'root_too_broad' | 'root_system' | 'unavailable';

export class ProjectFsError extends Error {
  readonly code: ProjectFsCode;
  constructor(code: ProjectFsCode, detail: string) {
    super(detail);
    this.name = 'ProjectFsError';
    this.code = code;
  }
}

export interface ApplyResult {
  path: string;
  status: 'applied' | 'failed';
  reason: string | null;
}

export interface FileList {
  root: string;
  files: string[];
  truncated: boolean;
}

async function defaultInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

function toError(e: unknown): ProjectFsError {
  if (e && typeof e === 'object' && 'code' in e) {
    const { code, detail } = e as { code: unknown; detail?: unknown };
    if (typeof code === 'string') {
      return new ProjectFsError(code as ProjectFsCode, typeof detail === 'string' ? detail : '');
    }
  }
  return new ProjectFsError('unavailable', e instanceof Error ? e.message : String(e));
}

export function createProjectFiles(invoke: Invoke = defaultInvoke, desktop = isDesktop()) {
  async function call<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    if (!desktop) throw new ProjectFsError('unavailable', 'desktop only');
    try {
      return await invoke<T>(cmd, args);
    } catch (e) {
      throw toError(e);
    }
  }
  return {
    available: desktop,
    /** Validates the folder and returns its canonical path. */
    checkRoot: (root: string) => call<string>('project_check_root', { root }),
    list: (root: string) => call<FileList>('project_list_files', { root }),
    /**
     * What reading these files gives (size, truncation, redactions, refusals),
     * without the contents: Rust reads them itself for the Builder's prompt.
     */
    inspect: (root: string, paths: string[]) =>
      call<ContextFile[]>('project_inspect_files', { root, paths }),
    /** Writes the approved changes inside the folder; each file succeeds or fails alone. */
    apply: (root: string, changes: ProposedChange[]) =>
      call<ApplyResult[]>('project_apply_changes', {
        root,
        changes: changes.map(({ path, kind, diff }) => ({ path, kind, diff })),
      }),
  };
}

export type ProjectFiles = ReturnType<typeof createProjectFiles>;
