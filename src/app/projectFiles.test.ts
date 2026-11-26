import { describe, expect, it, vi } from 'vitest';
import { createProjectFiles, ProjectFsError } from './projectFiles.ts';

describe('project files bridge', () => {
  it('forwards calls to the Rust commands', async () => {
    const invoke = vi.fn(async (cmd: string) =>
      cmd === 'project_list_files' ? { root: 'C:/p', files: ['a.ts'], truncated: false } : [],
    ) as never;
    const files = createProjectFiles(invoke, true);
    await files.list('C:/p');
    await files.inspect('C:/p', ['a.ts']);
    await files.checkRoot('C:/p');
    expect((invoke as ReturnType<typeof vi.fn>).mock.calls).toEqual([
      ['project_list_files', { root: 'C:/p' }],
      ['project_inspect_files', { root: 'C:/p', paths: ['a.ts'] }],
      ['project_check_root', { root: 'C:/p' }],
    ]);
  });

  it('turns Rust errors into typed errors with a code', async () => {
    const invoke = vi.fn(async () => {
      throw { code: 'root_too_broad', detail: 'D:/' };
    }) as never;
    const error = await createProjectFiles(invoke, true)
      .checkRoot('D:/')
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProjectFsError);
    expect((error as ProjectFsError).code).toBe('root_too_broad');
  });

  it('refuses to run outside the desktop app', async () => {
    const invoke = vi.fn() as never;
    const files = createProjectFiles(invoke, false);
    expect(files.available).toBe(false);
    await expect(files.list('C:/p')).rejects.toMatchObject({ code: 'unavailable' });
    expect(invoke).not.toHaveBeenCalled();
  });
});
