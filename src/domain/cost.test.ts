import { describe, expect, it } from 'vitest';
import { estimateCost, isValidPricing, runForEvent, type Pricing } from './cost.ts';
import type { AgentRun, Session } from './types.ts';

const pricing: Pricing = {
  inputPerMillion: 2,
  outputPerMillion: 8,
  currency: 'USD',
  asOf: '2026-11-21',
};

describe('estimateCost', () => {
  it('prices only real usage', () => {
    const cost = estimateCost(
      [
        { inputTokens: 1_000_000, outputTokens: 500_000, synthetic: false },
        { inputTokens: 9_999_999, outputTokens: 9_999_999, synthetic: true },
      ],
      pricing,
    );
    expect(cost).toBeCloseTo(6);
  });

  it('returns null without prices or without real usage', () => {
    const real = [{ inputTokens: 10, outputTokens: 10, synthetic: false }];
    expect(estimateCost(real, null)).toBeNull();
    expect(estimateCost([{ ...real[0]!, synthetic: true }], pricing)).toBeNull();
    expect(estimateCost(real, { ...pricing, currency: 'dollar' })).toBeNull();
    expect(estimateCost(real, { ...pricing, inputPerMillion: 0, outputPerMillion: 0 })).toBeNull();
  });

  it('validates prices', () => {
    expect(isValidPricing(pricing)).toBe(true);
    expect(isValidPricing({ ...pricing, inputPerMillion: -1 })).toBe(false);
    expect(isValidPricing({ ...pricing, outputPerMillion: Number.NaN })).toBe(false);
  });
});

describe('runForEvent', () => {
  const run = (
    id: string,
    role: AgentRun['role'],
    status: AgentRun['status'] = 'ok',
  ): AgentRun => ({
    id,
    role,
    provider: 'mock',
    model: 'mock',
    startedAt: '',
    finishedAt: '',
    durationMs: 1,
    status,
    tools: [],
  });

  it('pairs the n-th event with the n-th successful run of its agent', () => {
    const session = {
      events: [
        { id: 'e1', at: '', kind: 'plan', message: '' },
        { id: 'e2', at: '', kind: 'plan', message: '' },
        { id: 'e3', at: '', kind: 'approval', message: '' },
      ],
      runs: [run('r1', 'planner'), run('rx', 'planner', 'failed'), run('r2', 'planner')],
    } as unknown as Session;
    expect(runForEvent(session, session.events[0]!)?.id).toBe('r1');
    expect(runForEvent(session, session.events[1]!)?.id).toBe('r2');
    expect(runForEvent(session, session.events[2]!)).toBeUndefined();
  });
});
