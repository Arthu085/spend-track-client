import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { OfflineAlert } from '../offline-alert';

const setOnline = (online: boolean) => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
};

describe('OfflineAlert', () => {
  it('shows while the browser is offline', () => {
    render(<OfflineAlert />);
    expect(screen.queryByRole('alert')).toBeNull();

    setOnline(false);
    expect(screen.getByRole('alert')).toHaveTextContent(i18n.t('pwa.offline'));

    setOnline(true);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
