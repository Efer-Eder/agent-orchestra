import { describe, expect, it } from 'vitest';
import { createMockProvider } from '../providers/mock.ts';
import { sequentialIds } from './ids.ts';
import type { AgentProvider } from './provider.ts';
import type { Session } from './types.ts';
import {
  approvePlan,
  canTransition,
  cancelSession,
  createProject,
  createSession,
  MAX_REQUEST_LENGTH,
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
    expect(session.status).toBe('completed');
    expect(session.review?.verdict).toBe('approve');

    expect(session.events.map((e) => e.kind)).toEqual([
      'request',
      'plan',
      'approval',
      'execution',
      'review',
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
