import { defaultIdFactory, systemClock, type Clock, type IdFactory } from './ids.ts';
import type { AgentProvider } from './provider.ts';
import type {
  AgentRole,
  FileContent,
  Project,
  Session,
  SessionStatus,
  TimelineEvent,
  TimelineEventKind,
  Usage,
} from './types.ts';

export const MAX_REQUEST_LENGTH = 10_000;
export const MAX_ERROR_LENGTH = 500;

export type WorkflowErrorCode = 'invalid_input' | 'invalid_transition';

/** Why an input was refused, so the UI can show it in the user's language. */
export type WorkflowErrorReason = 'empty_project_name' | 'empty_request' | 'request_too_long';

export class WorkflowError extends Error {
  readonly code: WorkflowErrorCode;
  readonly reason: WorkflowErrorReason | undefined;
  constructor(code: WorkflowErrorCode, message: string, reason?: WorkflowErrorReason) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.reason = reason;
  }
}

/**
 * Explicit state machine:
 * request → plan → human approval → execution → review → final human approval.
 * Nothing can skip either approval.
 */
const TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  draft: ['planning', 'cancelled'],
  planning: ['awaiting_approval', 'cancelled', 'failed'],
  awaiting_approval: ['executing', 'rejected', 'cancelled'],
  executing: ['reviewing', 'cancelled', 'failed'],
  reviewing: ['awaiting_final_approval', 'cancelled', 'failed'],
  awaiting_final_approval: ['completed', 'rejected', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
  failed: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: SessionStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export interface WorkflowDeps {
  ids?: IdFactory;
  clock?: Clock;
}

interface ResolvedDeps {
  ids: IdFactory;
  clock: Clock;
}

function resolve(deps: WorkflowDeps = {}): ResolvedDeps {
  return { ids: deps.ids ?? defaultIdFactory, clock: deps.clock ?? systemClock };
}

function event(
  d: ResolvedDeps,
  kind: TimelineEventKind,
  message: string,
  role?: AgentRole,
  extra: Pick<TimelineEvent, 'detail' | 'code'> = {},
): TimelineEvent {
  return {
    id: d.ids(),
    at: d.clock().toISOString(),
    kind,
    message,
    ...(role ? { role } : {}),
    ...extra,
  };
}

function moveTo(
  session: Session,
  to: SessionStatus,
  patch: Partial<Session> = {},
  events: TimelineEvent[] = [],
): Session {
  if (!canTransition(session.status, to)) {
    throw new WorkflowError('invalid_transition', `Transição inválida: ${session.status} → ${to}`);
  }
  return { ...session, ...patch, status: to, events: [...session.events, ...events] };
}

function addUsage(session: Session, usage: Usage | undefined): Usage[] {
  return usage ? [...session.usage, usage] : session.usage;
}

function isAbort(error: unknown, signal: AbortSignal | undefined): boolean {
  if (signal?.aborted === true) return true;
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: unknown }).name === 'AbortError'
  );
}

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.length > MAX_ERROR_LENGTH ? `${raw.slice(0, MAX_ERROR_LENGTH)}…` : raw;
}

function fail(
  session: Session,
  error: unknown,
  signal: AbortSignal | undefined,
  d: ResolvedDeps,
): Session {
  if (isAbort(error, signal)) {
    return moveTo(session, 'cancelled', {}, [
      event(d, 'cancelled', 'Execução cancelada.', undefined, { code: 'cancelled' }),
    ]);
  }
  const message = errorMessage(error);
  return moveTo(session, 'failed', { error: message }, [event(d, 'error', message)]);
}

export function createProject(name: string, rootLabel: string, deps?: WorkflowDeps): Project {
  const d = resolve(deps);
  const trimmed = name.trim();
  if (!trimmed) {
    throw new WorkflowError(
      'invalid_input',
      'O nome do projeto é obrigatório.',
      'empty_project_name',
    );
  }
  return {
    id: d.ids(),
    name: trimmed,
    rootLabel: rootLabel.trim(),
    createdAt: d.clock().toISOString(),
  };
}

export function createSession(project: Project, request: string, deps?: WorkflowDeps): Session {
  const d = resolve(deps);
  const trimmed = request.trim();
  if (!trimmed) {
    throw new WorkflowError(
      'invalid_input',
      'A solicitação não pode ficar vazia.',
      'empty_request',
    );
  }
  if (trimmed.length > MAX_REQUEST_LENGTH) {
    throw new WorkflowError(
      'invalid_input',
      `A solicitação excede ${MAX_REQUEST_LENGTH} caracteres.`,
      'request_too_long',
    );
  }
  const firstLine = trimmed.split('\n')[0] ?? trimmed;
  return {
    id: d.ids(),
    projectId: project.id,
    title: firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine,
    request: trimmed,
    status: 'draft',
    usage: [],
    events: [event(d, 'request', trimmed)],
  };
}

export interface RunOptions extends WorkflowDeps {
  signal?: AbortSignal;
  /** Lists the readable files of the authorized project (desktop only). */
  loadTree?: () => Promise<string[] | null>;
  /** Reads the approved files (desktop only). Errors fail the session. */
  loadFiles?: (paths: string[]) => Promise<FileContent[]>;
}

/** Planner step. Ends in `awaiting_approval`: a human must decide what happens next. */
export async function runPlanning(
  session: Session,
  provider: AgentProvider,
  options: RunOptions = {},
): Promise<Session> {
  const d = resolve(options);
  const planning = moveTo(session, 'planning');
  try {
    const tree = options.loadTree ? await options.loadTree() : null;
    const { output, usage } = await provider.plan(
      planning.request,
      options.signal,
      tree ?? undefined,
    );
    return moveTo(
      planning,
      'awaiting_approval',
      { plan: output, usage: addUsage(planning, usage) },
      [event(d, 'plan', `${output.summary} (${output.tasks.length} tarefa(s)).`, 'planner')],
    );
  } catch (error) {
    return fail(planning, error, options.signal, d);
  }
}

/** Human approval: the only way to reach the execution step. */
export function approvePlan(session: Session, deps?: WorkflowDeps): Session {
  const d = resolve(deps);
  if (!session.plan) throw new WorkflowError('invalid_transition', 'Não há plano para aprovar.');
  return moveTo(session, 'executing', {}, [event(d, 'approval', 'Plano aprovado pelo usuário.')]);
}

/** Final human approval: accepts the reviewed proposal and closes the session. */
export function approveFinal(session: Session, deps?: WorkflowDeps): Session {
  const d = resolve(deps);
  return moveTo(session, 'completed', {}, [
    event(d, 'final_approval', 'Proposta aceita pelo usuário.'),
  ]);
}

/** Rejects the plan (before execution) or the reviewed proposal (at the end). */
export function rejectPlan(session: Session, reason: string, deps?: WorkflowDeps): Session {
  const d = resolve(deps);
  const detail = reason.trim();
  const why = detail || 'sem motivo informado';
  return moveTo(session, 'rejected', {}, [
    event(d, 'rejection', `Plano rejeitado pelo usuário: ${why}.`, undefined, { detail }),
  ]);
}

/** Builder step. Produces *proposed* changes only; nothing is written to disk. */
export async function runExecution(
  session: Session,
  provider: AgentProvider,
  options: RunOptions = {},
): Promise<Session> {
  const d = resolve(options);
  if (session.status !== 'executing' || !session.plan) {
    throw new WorkflowError('invalid_transition', 'A execução exige um plano aprovado.');
  }
  try {
    const wanted = session.plan.files ?? [];
    const files = wanted.length && options.loadFiles ? await options.loadFiles(wanted) : [];
    const readable = files.filter((f) => !f.skipped);
    const { output, usage } = await provider.build(
      session.plan,
      options.signal,
      readable.length ? readable : undefined,
    );
    // Keep only metadata of what was read: contents never go into saved data.
    const context = files.map((f) => ({
      path: f.path,
      bytes: f.bytes,
      truncated: f.truncated,
      redactions: f.redactions,
      skipped: f.skipped,
    }));
    const patch = {
      changes: output,
      usage: addUsage(session, usage),
      ...(context.length ? { context } : {}),
    };
    return moveTo(session, 'reviewing', patch, [
      event(
        d,
        'execution',
        `${output.length} alteração(ões) proposta(s), não aplicada(s) ao disco.`,
        'builder',
      ),
    ]);
  } catch (error) {
    return fail(session, error, options.signal, d);
  }
}

/** Reviewer step. Ends in `awaiting_final_approval`: the human closes the session. */
export async function runReview(
  session: Session,
  provider: AgentProvider,
  options: RunOptions = {},
): Promise<Session> {
  const d = resolve(options);
  if (session.status !== 'reviewing') {
    throw new WorkflowError('invalid_transition', 'A revisão exige uma execução concluída.');
  }
  try {
    const { output, usage } = await provider.review(session.changes ?? [], options.signal, {
      request: session.request,
      ...(session.plan ? { plan: session.plan } : {}),
    });
    const label = output.verdict === 'approve' ? 'aprovado' : 'pede ajustes';
    return moveTo(
      session,
      'awaiting_final_approval',
      { review: output, usage: addUsage(session, usage) },
      [event(d, 'review', `Revisão: ${label}. ${output.comments.join(' ')}`.trim(), 'reviewer')],
    );
  } catch (error) {
    return fail(session, error, options.signal, d);
  }
}

/**
 * Sessions persisted while a provider call was in flight cannot resume that
 * call. On load they are marked as failed so the user sees what happened.
 */
export function recoverInterrupted(session: Session, deps?: WorkflowDeps): Session {
  if (!['planning', 'executing', 'reviewing'].includes(session.status)) return session;
  const d = resolve(deps);
  const message = 'Interrompida: o app foi fechado ou recarregado durante a execução.';
  return moveTo(session, 'failed', { error: message }, [
    event(d, 'error', message, undefined, { code: 'interrupted' }),
  ]);
}

export function cancelSession(session: Session, deps?: WorkflowDeps): Session {
  const d = resolve(deps);
  if (isTerminal(session.status)) return session;
  return moveTo(session, 'cancelled', {}, [
    event(d, 'cancelled', 'Sessão cancelada pelo usuário.', undefined, { code: 'cancelled' }),
  ]);
}

export function totalUsage(session: Session): Usage {
  return session.usage.reduce<Usage>(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      synthetic: acc.synthetic || u.synthetic,
    }),
    { inputTokens: 0, outputTokens: 0, synthetic: false },
  );
}
