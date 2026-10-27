import { fireEvent, render, screen } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { UpdatePrompt } from '../update-prompt';

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: vi.fn() }));

const setNeedRefresh = vi.fn();
const updateServiceWorker = vi.fn(() => Promise.resolve());

const stubRegistration = (needRefresh: boolean) => {
  vi.mocked(useRegisterSW).mockReturnValue({
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker,
  });
};

const renderPrompt = () =>
  render(
    <AntdApp>
      <UpdatePrompt />
    </AntdApp>,
  );

beforeEach(() => {
  setNeedRefresh.mockClear();
  updateServiceWorker.mockClear();
});

describe('UpdatePrompt', () => {
  it('stays hidden while no new version is waiting', () => {
    stubRegistration(false);
    renderPrompt();

    expect(screen.queryByText(i18n.t('pwa.update.title'))).toBeNull();
  });

  it('reloads into the waiting version on request', async () => {
    stubRegistration(true);
    renderPrompt();

    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('pwa.update.reload') }),
    );

    expect(updateServiceWorker).toHaveBeenCalledOnce();
  });

  it('dismisses the prompt when the notice is closed', async () => {
    stubRegistration(true);
    renderPrompt();

    await screen.findByText(i18n.t('pwa.update.title'));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });
});
