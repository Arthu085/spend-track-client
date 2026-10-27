import { isLanguage, type Language } from './language';

export const LANGUAGE_STORAGE_KEY = 'language';

export const readStoredLanguage = (): Language | null => {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
};

export const storeLanguage = (language: Language) => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The choice still applies to this page when storage is unavailable.
  }
};

export const onStoredLanguageChange = (
  listener: (language: Language) => void,
): (() => void) => {
  const handleStorage = ({ key, newValue }: StorageEvent) => {
    if (key === LANGUAGE_STORAGE_KEY && isLanguage(newValue)) {
      listener(newValue);
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => window.removeEventListener('storage', handleStorage);
};
