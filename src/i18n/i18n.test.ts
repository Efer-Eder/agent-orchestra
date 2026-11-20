import { describe, expect, it } from 'vitest';
import { detectLocale, normalizeLocale } from './locale.ts';
import { MESSAGES } from './messages.ts';

function shape(value: unknown): unknown {
  if (typeof value === 'function') return 'fn';
  if (Array.isArray(value)) return `array:${value.length}`;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, shape((value as Record<string, unknown>)[k])]),
    );
  }
  return typeof value;
}

describe('messages', () => {
  it('English has exactly the same keys as Portuguese', () => {
    expect(shape(MESSAGES['en-US'])).toEqual(shape(MESSAGES['pt-BR']));
  });

  it('has no empty strings', () => {
    const walk = (v: unknown): string[] =>
      typeof v === 'string'
        ? [v]
        : v && typeof v === 'object'
          ? Object.values(v).flatMap(walk)
          : [];
    for (const locale of ['pt-BR', 'en-US'] as const) {
      expect(walk(MESSAGES[locale]).every((s) => s.trim().length > 0)).toBe(true);
    }
  });

  it('pluralizes', () => {
    expect(MESSAGES['en-US'].session.proposed(1)).toMatch(/^1 proposed change,/);
    expect(MESSAGES['en-US'].session.proposed(3)).toMatch(/^3 proposed changes,/);
    expect(MESSAGES['pt-BR'].projects.sessions(1)).toBe('1 sessão');
    expect(MESSAGES['pt-BR'].projects.sessions(2)).toBe('2 sessões');
  });
});

describe('locale detection', () => {
  it('normalizes language tags', () => {
    expect(normalizeLocale('pt')).toBe('pt-BR');
    expect(normalizeLocale('pt-PT')).toBe('pt-BR');
    expect(normalizeLocale('en-GB')).toBe('en-US');
    expect(normalizeLocale('fr')).toBeNull();
  });

  it('prefers ?lang=, then the saved choice, then the browser', () => {
    expect(detectLocale({ search: '?lang=en', saved: 'pt-BR', languages: ['pt-BR'] })).toBe(
      'en-US',
    );
    expect(detectLocale({ saved: 'pt-BR', languages: ['en-US'] })).toBe('pt-BR');
    expect(detectLocale({ saved: 'xx', languages: ['fr-FR', 'pt-BR'] })).toBe('pt-BR');
    expect(detectLocale({ languages: ['de-DE'] })).toBe('en-US');
  });
});
