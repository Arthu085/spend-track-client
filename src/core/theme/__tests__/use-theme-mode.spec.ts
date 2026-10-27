import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stubColorScheme = (prefersDark: boolean) => {
  const mediaQuery = Object.assign(new EventTarget(), {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
  });
  vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery);

  return (nextPrefersDark: boolean) => {
    mediaQuery.matches = nextPrefersDark;
    mediaQuery.dispatchEvent(new Event('change'));
  };
};

let unmount: (() => void) | undefined;

// The module reads the stored choice when it loads, so each test loads a fresh copy together with
// its own Testing Library and React instances.
const renderThemeMode = async () => {
  vi.resetModules();
  const [{ act, renderHook }, themeMode] = await Promise.all([
    import('@testing-library/react'),
    import('../use-theme-mode'),
  ]);
  const hook = renderHook(() => themeMode.useThemeMode());
  unmount = hook.unmount;
  return { act, result: hook.result, ...themeMode };
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.restoreAllMocks();
});

describe('useThemeMode', () => {
  it.each([
    [false, 'light'],
    [true, 'dark'],
  ])(
    'maps prefers dark %s to %s without a stored choice',
    async (prefersDark, mode) => {
      stubColorScheme(prefersDark);

      const { result } = await renderThemeMode();

      expect(result.current).toBe(mode);
    },
  );

  it('follows system color scheme changes without a stored choice', async () => {
    const changeColorScheme = stubColorScheme(false);
    const { act, result } = await renderThemeMode();

    act(() => changeColorScheme(true));

    expect(result.current).toBe('dark');
  });

  it('applies a stored choice over the system color scheme', async () => {
    stubColorScheme(true);
    localStorage.setItem('theme-mode', 'light');

    const { result } = await renderThemeMode();

    expect(result.current).toBe('light');
  });

  it('ignores an invalid stored value', async () => {
    stubColorScheme(true);
    localStorage.setItem('theme-mode', 'sepia');

    const { result } = await renderThemeMode();

    expect(result.current).toBe('dark');
  });

  it('stores a selected mode and keeps it when the system changes', async () => {
    const changeColorScheme = stubColorScheme(false);
    const { act, result, setThemeMode } = await renderThemeMode();

    act(() => setThemeMode('dark'));
    act(() => changeColorScheme(false));

    expect(result.current).toBe('dark');
    expect(localStorage.getItem('theme-mode')).toBe('dark');
  });

  it('applies a mode selected in another tab', async () => {
    stubColorScheme(false);
    const { act, result, THEME_MODE_STORAGE_KEY } = await renderThemeMode();

    act(() => {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_MODE_STORAGE_KEY }),
      );
    });

    expect(result.current).toBe('dark');
  });
});
