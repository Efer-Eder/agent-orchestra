import type { AgentRun, Session, TimelineEvent, Usage } from './types.ts';

/**
 * Prices typed by the user, per 1 million tokens. The app never fetches prices:
 * any cost shown is an estimate from these numbers and is labelled as such.
 */
export interface Pricing {
  inputPerMillion: number;
  outputPerMillion: number;
  /** ISO 4217 code, e.g. USD or BRL. */
  currency: string;
  /** Date the prices were copied from the provider (YYYY-MM-DD). */
  asOf: string;
}

export function isValidPricing(p: Pricing | null | undefined): p is Pricing {
  return (
    !!p &&
    Number.isFinite(p.inputPerMillion) &&
    Number.isFinite(p.outputPerMillion) &&
    p.inputPerMillion >= 0 &&
    p.outputPerMillion >= 0 &&
    p.inputPerMillion + p.outputPerMillion > 0 &&
    /^[A-Z]{3}$/.test(p.currency)
  );
}

/**
 * Estimated cost of the real (non-synthetic) usage. Returns null when there is
 * no valid price table or nothing real to price, so the UI can say why.
 */
export function estimateCost(usages: readonly Usage[], pricing: Pricing | null): number | null {
  if (!isValidPricing(pricing)) return null;
  const real = usages.filter((u) => !u.synthetic);
  if (!real.length) return null;
  return real.reduce(
    (sum, u) =>
      sum +
      (u.inputTokens * pricing.inputPerMillion + u.outputTokens * pricing.outputPerMillion) /
        1_000_000,
    0,
  );
}

const ROLE_EVENT = { planner: 'plan', builder: 'execution', reviewer: 'review' } as const;

/**
 * The successful run behind a timeline event: the n-th event of a kind
 * matches the n-th successful run of the agent that produces it.
 */
export function runForEvent(session: Session, ev: TimelineEvent): AgentRun | undefined {
  const role = (Object.keys(ROLE_EVENT) as (keyof typeof ROLE_EVENT)[]).find(
    (r) => ROLE_EVENT[r] === ev.kind,
  );
  if (!role) return undefined;
  const index = session.events.filter((e) => e.kind === ev.kind).findIndex((e) => e.id === ev.id);
  return (session.runs ?? []).filter((r) => r.role === role && r.status === 'ok')[index];
}
