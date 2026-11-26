import { describe, expect, it } from 'vitest';
import { highlight } from './highlighter.ts';
import { languageForFence, languageForPath, splitFences } from './lang.ts';

describe('syntax highlighting', () => {
  it('picks the language from the path or the fence', () => {
    expect(languageForPath('src/auth/login.ts')).toBe('typescript');
    expect(languageForPath('src-tauri/src/lib.rs')).toBe('rust');
    expect(languageForPath('README')).toBeNull();
    expect(languageForFence('tsx')).toBe('typescript');
    expect(languageForFence('python title="x"')).toBe('python');
    expect(languageForFence('brainfuck')).toBeNull();
  });

  it('escapes what it highlights, so model output cannot inject HTML', () => {
    const html = highlight('const a = "<img src=x onerror=alert(1)>";', 'typescript')!;
    expect(html).toContain('hljs-keyword');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(highlight('x', null)).toBeNull();
  });

  it('splits prose and fenced code, even an unfinished fence while streaming', () => {
    expect(splitFences('Veja:\n```ts\nconst a = 1;\n```\nfim')).toEqual([
      { kind: 'text', text: 'Veja:\n' },
      { kind: 'code', code: 'const a = 1;', language: 'typescript' },
      { kind: 'text', text: '\nfim' },
    ]);
    expect(splitFences('```py\nprint(1)')).toEqual([
      { kind: 'code', code: 'print(1)', language: 'python' },
    ]);
  });
});
