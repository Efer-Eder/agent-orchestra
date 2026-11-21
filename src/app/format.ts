import type { AgentRun } from '../domain/types.ts';

export function formatDuration(ms: number, locale: string): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const s = ms / 1000;
  return `${s.toLocaleString(locale, { maximumFractionDigits: s < 10 ? 1 : 0 })} s`;
}

export function formatMoney(value: number, currency: string, locale: string): string {
  const digits = value < 0.01 ? 4 : 2;
  try {
    return value.toLocaleString(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  } catch {
    return `${currency} ${value.toFixed(digits)}`;
  }
}

/** "modelo · 1,2 s · 1.234 tokens" for an agent turn; synthetic numbers are marked. */
export function runSummary(run: AgentRun, locale: string, syntheticLabel: string): string {
  const parts = [run.model, formatDuration(run.durationMs, locale)];
  if (run.usage) {
    const total = run.usage.inputTokens + run.usage.outputTokens;
    parts.push(
      `${total.toLocaleString(locale)} tokens${run.usage.synthetic ? ` ${syntheticLabel}` : ''}`,
    );
  }
  return parts.join(' · ');
}
