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
