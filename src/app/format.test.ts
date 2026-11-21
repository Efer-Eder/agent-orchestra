import { describe, expect, it } from 'vitest';
import { formatDuration, formatMoney, runSummary } from './format.ts';

describe('format helpers', () => {
  it('formats durations', () => {
    expect(formatDuration(850, 'en-US')).toBe('850 ms');
    expect(formatDuration(1250, 'pt-BR')).toBe('1,3 s');
    expect(formatDuration(42_000, 'en-US')).toBe('42 s');
  });

  it('formats money and survives a bad currency code', () => {
    expect(formatMoney(1.5, 'USD', 'en-US')).toBe('$1.50');
    expect(formatMoney(0.0012, 'USD', 'en-US')).toBe('$0.0012');
    expect(formatMoney(2, 'ZZZZ', 'en-US')).toBe('ZZZZ 2.00');
  });

  it('summarises a run and marks synthetic tokens', () => {
    const run = {
      id: 'r',
      role: 'planner' as const,
      provider: 'mock',
      model: 'mock',
      startedAt: '',
      finishedAt: '',
      durationMs: 650,
      status: 'ok' as const,
      usage: { inputTokens: 1000, outputTokens: 234, synthetic: true },
      tools: [],
    };
    expect(runSummary(run, 'en-US', '(synthetic)')).toBe(
      'mock · 650 ms · 1,234 tokens (synthetic)',
    );
  });
});
