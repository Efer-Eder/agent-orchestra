import { LOCALES, type Locale } from './messages.ts';

export const LOCALE_KEY = 'agent-orchestra.locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Maps any language tag (`en`, `en-GB`, `pt`, `pt-PT`…) to a supported locale. */
export function normalizeLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const lower = tag.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('en')) return 'en-US';
  return null;
}

/**
 * Order: `?lang=` in the URL (useful for demo links), then the saved choice,
 * then the browser/OS languages. English is the fallback for anything else.
 */
export function detectLocale(
  env: {
    search?: string;
    saved?: string | null;
    languages?: readonly string[];
  } = {},
): Locale {
  const fromUrl = normalizeLocale(new URLSearchParams(env.search ?? '').get('lang'));
  if (fromUrl) return fromUrl;
  if (isLocale(env.saved)) return env.saved;
  for (const lang of env.languages ?? []) {
    const found = normalizeLocale(lang);
    if (found) return found;
  }
  return 'en-US';
}

export function readSavedLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_KEY);
  } catch {
    return null;
  }
}

export function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // storage unavailable: the choice lasts for this session only
  }
}

export function browserLocale(): Locale {
  return detectLocale({
    search: typeof location === 'undefined' ? '' : location.search,
    saved: readSavedLocale(),
    languages: typeof navigator === 'undefined' ? [] : navigator.languages,
  });
}
