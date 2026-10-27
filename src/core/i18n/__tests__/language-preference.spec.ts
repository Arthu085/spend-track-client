import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LANGUAGE_STORAGE_KEY,
  onStoredLanguageChange,
  readStoredLanguage,
  storeLanguage,
} from '../language-preference';

// The browser fires `storage` only in the other tabs of the origin, so tests dispatch it directly.
const storageChange = (key: string, newValue: string | null) => {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
};

afterEach(() => {
  localStorage.clear();
});

describe('language preference', () => {
  it('reads back a stored language', () => {
    storeLanguage('en');

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(readStoredLanguage()).toBe('en');
  });

  it('ignores a missing or unsupported stored value', () => {
    expect(readStoredLanguage()).toBeNull();

    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');

    expect(readStoredLanguage()).toBeNull();
  });
});

describe('onStoredLanguageChange', () => {
  it('reports a supported language stored by another tab until unsubscribed', () => {
    const listener = vi.fn();
    const unsubscribe = onStoredLanguageChange(listener);

    storageChange(LANGUAGE_STORAGE_KEY, 'en');
    storageChange(LANGUAGE_STORAGE_KEY, 'fr');
    storageChange(LANGUAGE_STORAGE_KEY, null);
    storageChange('theme-mode', 'en');
    unsubscribe();
    storageChange(LANGUAGE_STORAGE_KEY, 'pt-BR');

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith('en');
  });
});
