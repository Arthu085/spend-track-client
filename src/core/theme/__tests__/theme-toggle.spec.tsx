import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { ThemeToggle } from '../theme-toggle';
import { setThemeMode } from '../use-theme-mode';

beforeEach(() => {
  act(() => setThemeMode('light'));
});

describe('ThemeToggle', () => {
  it('switches between the light and dark themes', () => {
    render(<ThemeToggle />);

    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('theme.switchToDark') }),
    );
    expect(localStorage.getItem('theme-mode')).toBe('dark');

    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('theme.switchToLight') }),
    );
    expect(localStorage.getItem('theme-mode')).toBe('light');
  });
});
