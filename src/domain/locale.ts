/** Languages the app speaks. Shared by the domain, providers and UI. */
export type Locale = 'pt-BR' | 'en-US';

export const LOCALES: readonly Locale[] = ['pt-BR', 'en-US'];

/** Human name of the language, used in prompts sent to models. */
export const LANGUAGE_NAME: Record<Locale, string> = {
  'pt-BR': 'Brazilian Portuguese',
  'en-US': 'American English',
};
