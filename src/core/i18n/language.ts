export const SUPPORTED_LANGUAGES = ['pt-BR', 'en'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'pt-BR';

export const isLanguage = (value: unknown): value is Language =>
  SUPPORTED_LANGUAGES.some((language) => language === value);

export const toLanguage = (value: unknown): Language =>
  isLanguage(value) ? value : DEFAULT_LANGUAGE;

const primarySubtag = (tag: string): string => tag.split('-')[0].toLowerCase();

const matchLanguage = (tag: string): Language | undefined =>
  SUPPORTED_LANGUAGES.find(
    (language) => language.toLowerCase() === tag.toLowerCase(),
  ) ??
  SUPPORTED_LANGUAGES.find(
    (language) => primarySubtag(language) === primarySubtag(tag),
  );

export const resolveLanguage = (preferred: readonly string[]): Language => {
  for (const tag of preferred) {
    const language = matchLanguage(tag);

    if (language) {
      return language;
    }
  }

  return DEFAULT_LANGUAGE;
};
