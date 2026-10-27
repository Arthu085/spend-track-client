import { useSyncExternalStore } from 'react';
import type { ThemeMode } from '@/core/config/theme.config';

export const THEME_MODE_STORAGE_KEY = 'theme-mode';

const darkSchemeQuery = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark';

const readStoredThemeMode = (): ThemeMode | null => {
  try {
    const value = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return isThemeMode(value) ? value : null;
  } catch {
    return null;
  }
};

let selectedThemeMode = readStoredThemeMode();

const notify = () => listeners.forEach((listener) => listener());

const syncFromStorage = (event: StorageEvent) => {
  if (event.key !== THEME_MODE_STORAGE_KEY) return;
  selectedThemeMode = readStoredThemeMode();
  notify();
};

const getThemeMode = (): ThemeMode =>
  selectedThemeMode ??
  (window.matchMedia(darkSchemeQuery).matches ? 'dark' : 'light');

const subscribe = (onChange: () => void) => {
  const mediaQuery = window.matchMedia(darkSchemeQuery);
  mediaQuery.addEventListener('change', onChange);
  if (listeners.size === 0) window.addEventListener('storage', syncFromStorage);
  listeners.add(onChange);

  return () => {
    mediaQuery.removeEventListener('change', onChange);
    listeners.delete(onChange);
    if (listeners.size === 0)
      window.removeEventListener('storage', syncFromStorage);
  };
};

export const setThemeMode = (mode: ThemeMode) => {
  selectedThemeMode = mode;
  try {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  } catch {
    // The choice still applies to this page when storage is unavailable.
  }
  notify();
};

export const useThemeMode = () => useSyncExternalStore(subscribe, getThemeMode);
