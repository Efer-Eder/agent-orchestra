import { describe, expect, it } from 'vitest';
import { createMockProvider, slug, splitIntoTasks } from './mock.ts';

describe('mock provider', () => {
  it('identifies itself as offline', () => {
    const provider = createMockProvider();
    expect(provider.offline).toBe(true);
    expect(provider.label).toMatch(/mock/i);
  });

  it('is deterministic for the same input', async () => {
    const a = await createMockProvider().plan('Fazer A. Fazer B.');
    const b = await createMockProvider().plan('Fazer A. Fazer B.');
    expect(a).toEqual(b);
  });

  it('reports usage as synthetic', async () => {
    const { usage } = await createMockProvider().plan('Algo.');
    expect(usage?.synthetic).toBe(true);
  });

  it('produces only proposed diffs, never applied changes', async () => {
    const provider = createMockProvider();
    const { output: plan } = await provider.plan('Documentar API.');
    const { output: changes } = await provider.build(plan);
    expect(changes).toHaveLength(1);
    expect(changes[0]?.diff).toContain('+++ b/notes/01-documentar-api.md');
    expect(changes[0]?.diff).toContain('não aplicado ao disco');
  });

  it('asks for changes when there is nothing to review', async () => {
    const { output } = await createMockProvider().review([]);
    expect(output.verdict).toBe('request_changes');
  });
});

describe('splitIntoTasks', () => {
  it('splits by sentence and line, stripping list markers', () => {
    const tasks = splitIntoTasks('- Primeiro item\n2) Segundo item. Terceiro!');
    expect(tasks.map((t) => t.title)).toEqual(['Primeiro item', 'Segundo item.', 'Terceiro!']);
  });

  it('caps the number of tasks', () => {
    expect(splitIntoTasks('a. b. c. d. e. f. g.')).toHaveLength(5);
  });
});

describe('slug', () => {
  it('produces safe, relative path segments', () => {
    expect(slug('Ação: ../../etc/passwd')).toBe('acao-etc-passwd');
    expect(slug('!!!')).toBe('tarefa');
  });
});

describe('mock chat', () => {
  it('answers in persona and labels itself as demo', async () => {
    const { AGENTS } = await import('../domain/agents.ts');
    const { output, usage } = await createMockProvider().chat(AGENTS.builder, [
      { id: '1', from: 'user', content: 'Oi', at: '' },
    ]);
    expect(output).toContain('Builder');
    expect(output).toContain('modo demonstração');
    expect(usage?.synthetic).toBe(true);
  });
});

describe('mock provider in English', () => {
  it('plans, builds, reviews and chats in English', async () => {
    const { AGENTS } = await import('../domain/agents.ts');
    const p = createMockProvider({ locale: 'en-US' });
    const { output: plan } = await p.plan('Add login. Write tests.');
    expect(plan.summary).toBe('Mock plan generated from the request');
    expect(plan.tasks[0]?.detail).toMatch(/^Step 1/);
    const { output: changes } = await p.build(plan);
    expect(changes[0]?.diff).toContain('not applied to disk');
    const { output: review } = await p.review(changes);
    expect(review.comments[0]).toBe('2 changes checked by the mock reviewer.');
    const { output: reply } = await p.chat(AGENTS.builder, [
      { id: '1', from: 'user', content: 'Hi', at: '' },
    ]);
    expect(reply).toContain("I'm the Builder");
    expect(reply).toContain('Demo mode reply');
  });
});

describe('mock provider with project files', () => {
  it('picks files mentioned by the request, with README/package.json as fallback', async () => {
    const { pickFiles } = await import('./mock.ts');
    const tree = ['README.md', 'package.json', 'src/auth/login.ts', 'src/payments/api.ts'];
    expect(pickFiles('Melhorar o login', tree)).toEqual([
      'src/auth/login.ts',
      'README.md',
      'package.json',
    ]);
    expect(pickFiles('algo sem relação', ['src/a.ts'])).toEqual([]);
  });

  it('proposes modify diffs for the files it received', async () => {
    const p = createMockProvider({ locale: 'en-US' });
    const { output: plan } = await p.plan('Improve the login. Add tests.', undefined, [
      'src/auth/login.ts',
      'package.json',
    ]);
    expect(plan.files).toEqual(['src/auth/login.ts', 'package.json']);
    const { output } = await p.build(plan, undefined, [
      {
        path: 'src/auth/login.ts',
        content: 'export {}',
        bytes: 9,
        truncated: false,
        redactions: 0,
        skipped: null,
      },
      {
        path: 'package.json',
        content: '{}',
        bytes: 2,
        truncated: false,
        redactions: 0,
        skipped: null,
      },
    ]);
    expect(output).toHaveLength(1); // JSON has no comments, so it is left alone
    expect(output[0]?.kind).toBe('modify');
    expect(output[0]?.diff).toContain('+// Agent Orchestra (demo): Improve the login.');
    // No context lines: the mock never needs the file contents.
    expect(output[0]?.diff).toContain('@@ -0,0 +1 @@');
    expect(output[0]?.diff).not.toContain('export {}');
  });
});
