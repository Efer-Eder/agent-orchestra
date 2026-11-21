import type { SessionStatus } from '../domain/types.ts';

/** Token name used for the status dot/badge. */
export const STATUS_TONE: Record<SessionStatus, 'accent' | 'warn' | 'ok' | 'bad' | 'muted'> = {
  draft: 'muted',
  planning: 'accent',
  awaiting_approval: 'warn',
  executing: 'accent',
  reviewing: 'accent',
  awaiting_final_approval: 'warn',
  completed: 'ok',
  rejected: 'muted',
  cancelled: 'muted',
  failed: 'bad',
};

export const TONE_DOT: Record<(typeof STATUS_TONE)[SessionStatus], string> = {
  accent: 'bg-accent',
  warn: 'bg-warn',
  ok: 'bg-ok',
  bad: 'bg-bad',
  muted: 'bg-ink-3',
};

export const TONE_BADGE: Record<(typeof STATUS_TONE)[SessionStatus], string> = {
  accent: 'bg-accent-soft text-accent',
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-ok-soft text-ok',
  bad: 'bg-bad-soft text-bad',
  muted: 'bg-surface-2 text-ink-3',
};

/** Groups ISO dates as today / yesterday or a short localized date. */
export function dayLabel(
  iso: string,
  days: { today: string; yesterday: string },
  dateLocale: string,
  now: Date = new Date(),
): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return days.today;
  if (diff === 1) return days.yesterday;
  return d.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
}
