import { describe, expect, it } from 'vitest';
import { createMockProvider } from '../providers/mock.ts';
import { sequentialIds } from './ids.ts';
import type { AgentProvider } from './provider.ts';
import type { Session } from './types.ts';
import {
  approveFinal,
  approvePlan,
  canTransition,
  cancelSession,
  createProject,
  createSession,
  MAX_REQUEST_LENGTH,
  recoverInterrupted,
  recordApply,
  rejectPlan,
  runExecution,
  runPlanning,
  runReview,
  totalUsage,
  WorkflowError,
} from './workflow.ts';

const fixedClock = () => new Date('2026-11-20T12:00:00.000Z');

function deps() {
  return { ids: sequentialIds(), clock: fixedClock };
}

function newSession(request = 'Criar página de login. Adicionar testes.'): Session {
  const d = deps();
  const project = createProject('Demo', 'C:/projetos/demo', d);
  return createSession(project, request, d);
}

describe('createProject / createSession', () => {
  it('creates a project with trimmed fields', () => {
    const project = createProject('  Demo  ', ' C:/x ', deps());
    expect(project).toMatchObject({ id: 'id-1', name: 'Demo', rootLabel: 'C:/x' });
    expect(project.createdAt).toBe('2026-11-20T12:00:00.000Z');
  });

  it('rejects an empty project name', () => {
    expect(() => createProject('   ', '', deps())).toThrow(WorkflowError);
  });

  it('starts a session as draft with the request on the timeline', () => {
    const session = newSession();
    expect(session.status).toBe('draft');
    expect(session.events).toHaveLength(1);
    expect(session.events[0]?.kind).toBe('request');
  });

  it('rejects empty and oversized requests', () => {
    const project = createProject('Demo', '', deps());
    expect(() => createSession(project, '  ', deps())).toThrow(/vazia/);
    expect(() => createSession(project, 'x'.repeat(MAX_REQUEST_LENGTH + 1), deps())).toThrow(
      /excede/,
    );
  });

  it('truncates long titles', () => {
    const session = newSession('a'.repeat(100));
    expect(session.title).toHaveLength(61);
    expect(session.title.endsWith('…')).toBe(true);
  });
});

describe('state machine', () => {
  it('only allows execution after approval', () => {
    expect(canTransition('draft', 'executing')).toBe(false);
    expect(canTransition('planning', 'executing')).toBe(false);
    expect(canTransition('awaiting_approval', 'executing')).toBe(true);
  });

  it('treats terminal states as final', () => {
    for (const status of ['completed', 'rejected', 'cancelled', 'failed'] as const) {
      expect(canTransition(status, 'planning')).toBe(false);
    }
  });
});

describe('full mock flow: request → plan → approval → execution → review', () => {
  it('runs end to end with the offline mock provider', async () => {
    const provider = createMockProvider();
    const d = deps();
    let session = newSession('Criar página de login. Adicionar testes.');

    session = await runPlanning(session, provider, d);
    expect(session.status).toBe('awaiting_approval');
    expect(session.plan?.tasks.map((t) => t.title)).toEqual([
      'Criar página de login.',
      'Adicionar testes.',
    ]);

    session = approvePlan(session, d);
    expect(session.status).toBe('executing');

    session = await runExecution(session, provider, d);
    expect(session.status).toBe('reviewing');
    expect(session.changes?.map((c) => c.path)).toEqual([
      'notes/01-criar-pagina-de-login.md',
      'notes/02-adicionar-testes.md',
    ]);
    expect(session.changes?.every((c) => c.kind === 'create')).toBe(true);

    session = await runReview(session, provider, d);
    expect(session.status).toBe('awaiting_final_approval');
    expect(session.review?.verdict).toBe('approve');

    session = approveFinal(session, d);
    expect(session.status).toBe('completed');

    expect(session.events.map((e) => e.kind)).toEqual([
      'request',
      'plan',
      'approval',
      'execution',
      'review',
      'final_approval',
    ]);
    expect(session.events.filter((e) => e.role).map((e) => e.role)).toEqual([
      'planner',
      'builder',
      'reviewer',
    ]);

    const usage = totalUsage(session);
    expect(usage.synthetic).toBe(true);
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);
  });

  it('does not mutate the previous session object', async () => {
    const provider = createMockProvider();
    const draft = newSession();
    const planned = await runPlanning(draft, provider, deps());
    expect(draft.status).toBe('draft');
    expect(draft.events).toHaveLength(1);
    expect(planned).not.toBe(draft);
  });

  it('refuses to execute without approval', async () => {
    const provider = createMockProvider();
    const planned = await runPlanning(newSession(), provider, deps());
    await expect(runExecution(planned, provider, deps())).rejects.toThrow(WorkflowError);
  });

  it('refuses to approve a session without a plan', () => {
    expect(() => approvePlan(newSession(), deps())).toThrow(/plano/);
  });

  it('refuses to review before execution', async () => {
    const provider = createMockProvider();
    const planned = await runPlanning(newSession(), provider, deps());
    await expect(runReview(planned, provider, deps())).rejects.toThrow(WorkflowError);
  });

  it('ends as rejected when the human rejects the plan', async () => {
    const planned = await runPlanning(newSession(), createMockProvider(), deps());
    const rejected = rejectPlan(planned, 'escopo grande demais', deps());
    expect(rejected.status).toBe('rejected');
    expect(rejected.events.at(-1)?.message).toContain('escopo grande demais');
    expect(() => approvePlan(rejected, deps())).toThrow(WorkflowError);
  });
});

describe('errors and cancellation', () => {
  it('moves to failed with the provider error message', async () => {
    const session = await runPlanning(newSession(), createMockProvider({ failOn: 'plan' }), deps());
    expect(session.status).toBe('failed');
    expect(session.error).toMatch(/Falha simulada/);
    expect(session.events.at(-1)?.kind).toBe('error');
  });

  it('fails during execution and review too', async () => {
    const ok = createMockProvider();
    const approved = approvePlan(await runPlanning(newSession(), ok, deps()), deps());
    const failedBuild = await runExecution(approved, createMockProvider({ failOn: 'build' }));
    expect(failedBuild.status).toBe('failed');

    const reviewing = await runExecution(approved, ok, deps());
    const failedReview = await runReview(reviewing, createMockProvider({ failOn: 'review' }));
    expect(failedReview.status).toBe('failed');
  });

  it('truncates very long error messages', async () => {
    const noisy: AgentProvider = {
      ...createMockProvider(),
      plan: () => Promise.reject(new Error('x'.repeat(2000))),
    };
    const session = await runPlanning(newSession(), noisy, deps());
    expect(session.error?.length).toBeLessThanOrEqual(501);
  });

  it('cancels an in-flight call through AbortSignal', async () => {
    const provider = createMockProvider({ latencyMs: 1_000 });
    const controller = new AbortController();
    const pending = runPlanning(newSession(), provider, { ...deps(), signal: controller.signal });
    controller.abort();
    const session = await pending;
    expect(session.status).toBe('cancelled');
    expect(session.plan).toBeUndefined();
  });

  it('cancels immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const session = await runPlanning(newSession(), createMockProvider({ latencyMs: 10 }), {
      signal: controller.signal,
    });
    expect(session.status).toBe('cancelled');
  });

  it('lets the user cancel a waiting session but not a finished one', async () => {
    const planned = await runPlanning(newSession(), createMockProvider(), deps());
    const cancelled = cancelSession(planned, deps());
    expect(cancelled.status).toBe('cancelled');
    expect(cancelSession(cancelled, deps())).toBe(cancelled);
  });
});

describe('recoverInterrupted', () => {
  it('marks in-flight sessions as failed and leaves others alone', async () => {
    const planning = { ...newSession(), status: 'planning' as const };
    const recovered = recoverInterrupted(planning, deps());
    expect(recovered.status).toBe('failed');
    expect(recovered.error).toMatch(/Interrompida/);
    const planned = await runPlanning(newSession(), createMockProvider(), deps());
    expect(recoverInterrupted(planned)).toBe(planned);
  });
});

describe('translatable details', () => {
  it('keeps the rejection reason and error codes as data', async () => {
    const planned = await runPlanning(newSession(), createMockProvider(), deps());
    const rejected = rejectPlan(planned, 'grande demais', deps());
    expect(rejected.events.at(-1)?.detail).toBe('grande demais');
    const recovered = recoverInterrupted({ ...newSession(), status: 'planning' }, deps());
    expect(recovered.events.at(-1)?.code).toBe('interrupted');
    expect(() => createSession(createProject('P', ''), ' ')).toThrow(
      expect.objectContaining({ reason: 'empty_request' }),
    );
  });
});

describe('project files as Builder context', () => {
  const file = (path: string, content: string, skipped: string | null = null) => ({
    path,
    content,
    bytes: content.length,
    truncated: false,
    redactions: 0,
    skipped,
  });

  it('gives the tree to the Planner and the approved files to the Builder', async () => {
    const provider = createMockProvider();
    const tree = ['README.md', 'src/login/LoginPage.tsx', 'package.json'];
    const planned = await runPlanning(newSession('Criar página de login.'), provider, {
      ...deps(),
      loadTree: async () => tree,
    });
    expect(planned.plan?.files).toContain('src/login/LoginPage.tsx');

    const requested: string[][] = [];
    const done = await runExecution(approvePlan(planned, deps()), provider, {
      ...deps(),
      loadFiles: async (paths) => {
        requested.push(paths);
        return paths.map((p) =>
          p === 'package.json' ? file(p, '', 'denied') : file(p, `// ${p}\nconteúdo`),
        );
      },
    });
    expect(requested).toEqual([planned.plan!.files!]);
    expect(done.status).toBe('reviewing');
    expect(done.changes?.some((c) => c.kind === 'modify')).toBe(true);
    // Only metadata is kept on the session, never file contents.
    expect(JSON.stringify(done.context)).not.toContain('conteúdo');
    expect(done.context?.find((c) => c.path === 'package.json')?.skipped).toBe('denied');
  });

  it('does not read anything when the plan asks for no files', async () => {
    const planned = await runPlanning(newSession(), createMockProvider(), deps());
    let called = false;
    const done = await runExecution(approvePlan(planned, deps()), createMockProvider(), {
      loadFiles: async () => {
        called = true;
        return [];
      },
    });
    expect(called).toBe(false);
    expect(done.context).toBeUndefined();
  });

  it('fails the session when reading the folder fails', async () => {
    const planned = await runPlanning(newSession('Ajustar README.'), createMockProvider(), {
      loadTree: async () => ['README.md'],
    });
    const done = await runExecution(approvePlan(planned, deps()), createMockProvider(), {
      loadFiles: async () => {
        throw new Error('pasta não encontrada');
      },
    });
    expect(done.status).toBe('failed');
    expect(done.error).toBe('pasta não encontrada');
  });
});

describe('final approval', () => {
  async function reviewed(review?: AgentProvider['review']) {
    const base = createMockProvider();
    const provider = review ? { ...base, review } : base;
    const planned = await runPlanning(newSession('Criar login. Testar.'), provider, deps());
    const built = await runExecution(approvePlan(planned, deps()), provider, deps());
    return { session: await runReview(built, provider, deps()), provider };
  }

  it('waits for the human after the review and cannot be skipped', async () => {
    const { session } = await reviewed();
    expect(session.status).toBe('awaiting_final_approval');
    expect(canTransition('reviewing', 'completed')).toBe(false);
    expect(canTransition('awaiting_final_approval', 'completed')).toBe(true);
  });

  it('can reject the reviewed proposal with a reason', async () => {
    const { session } = await reviewed();
    const rejected = rejectPlan(session, 'falta teste de erro', deps());
    expect(rejected.status).toBe('rejected');
    expect(rejected.events.at(-1)?.detail).toBe('falta teste de erro');
  });

  it('gives the Reviewer the request and the plan, not only the diffs', async () => {
    let seen: unknown;
    await reviewed(async (changes, _signal, context) => {
      seen = context;
      return { output: { verdict: 'approve', comments: [String(changes.length)] } };
    });
    expect(seen).toMatchObject({
      request: 'Criar login. Testar.',
      plan: { tasks: [{ title: 'Criar login.' }, { title: 'Testar.' }] },
    });
  });
});

describe('agent run records', () => {
  function tickingClock(stepMs = 250) {
    let t = Date.parse('2026-11-20T12:00:00.000Z');
    return () => new Date((t += stepMs));
  }

  it('records one run per step with model, duration, usage and tools', async () => {
    const provider = createMockProvider();
    const d = { ids: sequentialIds(), clock: tickingClock() };
    const planned = await runPlanning(newSession('Criar página de login.'), provider, {
      ...d,
      loadTree: async () => ['README.md', 'src/login/LoginPage.tsx'],
    });
    const built = await runExecution(approvePlan(planned, d), provider, {
      ...d,
      loadFiles: async (paths) =>
        paths.map((path, i) => ({
          path,
          content: 'x',
          bytes: 1,
          truncated: false,
          redactions: 0,
          skipped: i === 0 ? null : 'denied',
        })),
    });
    const reviewed = await runReview(built, provider, d);

    const runs = reviewed.runs ?? [];
    expect(runs.map((r) => r.role)).toEqual(['planner', 'builder', 'reviewer']);
    for (const run of runs) {
      expect(run).toMatchObject({ provider: 'mock', model: 'mock', status: 'ok' });
      expect(run.durationMs).toBeGreaterThan(0);
      expect(run.usage?.synthetic).toBe(true);
    }
    expect(runs[0]?.tools).toEqual([
      expect.objectContaining({ tool: 'list_files', count: 2, skipped: 0 }),
    ]);
    const read = runs[1]?.tools[0];
    expect(read?.tool).toBe('read_files');
    expect((read?.count ?? 0) + (read?.skipped ?? 0)).toBe(planned.plan?.files?.length);
    expect(runs[2]?.tools).toEqual([]);
  });

  it('records failed and cancelled runs too', async () => {
    const failed = await runPlanning(newSession(), createMockProvider({ failOn: 'plan' }), deps());
    expect(failed.runs).toEqual([
      expect.objectContaining({ role: 'planner', status: 'failed', error: failed.error }),
    ]);

    const controller = new AbortController();
    const pending = runPlanning(newSession(), createMockProvider({ latencyMs: 1_000 }), {
      ...deps(),
      signal: controller.signal,
    });
    controller.abort();
    const cancelled = await pending;
    expect(cancelled.runs?.[0]?.status).toBe('cancelled');
  });
});

describe('files by reference and streaming', () => {
  it('passes the project root and onDelta to the provider, without file contents', async () => {
    const base = createMockProvider();
    const seen: { files?: unknown; root?: string; streamed: boolean } = { streamed: false };
    const spy: AgentProvider = {
      ...base,
      build: (plan, signal, files, extra) => {
        seen.files = files;
        if (extra?.root) seen.root = extra.root;
        extra?.onDelta?.('{');
        return base.build(plan, signal, files, extra);
      },
    };
    const planned = await runPlanning(newSession('Criar página de login.'), spy, {
      ...deps(),
      loadTree: async () => ['src/login/LoginPage.tsx'],
    });
    const deltas: string[] = [];
    const done = await runExecution(approvePlan(planned, deps()), spy, {
      ...deps(),
      projectRoot: 'C:/projetos/demo',
      onDelta: (t) => deltas.push(t),
      loadFiles: async (paths) =>
        paths.map((path) => ({ path, bytes: 12, truncated: false, redactions: 0, skipped: null })),
    });
    expect(done.status).toBe('reviewing');
    expect(seen.root).toBe('C:/projetos/demo');
    expect(JSON.stringify(seen.files)).not.toContain('content');
    expect(deltas).toEqual(['{']);
    expect(done.changes?.[0]?.diff).toContain('@@ -0,0 +1 @@');
  });
});

describe('writing approved changes', () => {
  it('records results only after the final approval', async () => {
    const provider = createMockProvider();
    const approved = approvePlan(await runPlanning(newSession(), provider, deps()), deps());
    const reviewed = await runReview(
      await runExecution(approved, provider, deps()),
      provider,
      deps(),
    );
    const path = reviewed.changes![0]!.path;
    expect(() => recordApply(reviewed, [{ path, status: 'applied' }], deps())).toThrow(
      WorkflowError,
    );
    const done = approveFinal(reviewed, deps());
    const written = recordApply(
      done,
      [
        { path, status: 'applied', reason: null },
        { path: 'x.ts', status: 'failed', reason: 'conflict' },
      ],
      deps(),
    );
    expect(written.status).toBe('completed');
    expect(written.applied?.[path]?.status).toBe('applied');
    expect(written.applied?.['x.ts']).toMatchObject({ status: 'failed', reason: 'conflict' });
    expect(written.events.at(-1)).toMatchObject({ kind: 'apply', detail: '1/2' });
  });
});
