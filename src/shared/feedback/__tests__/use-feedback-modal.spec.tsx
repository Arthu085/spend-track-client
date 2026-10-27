import { fireEvent, render, screen, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { App as AntdApp, Button } from 'antd';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import { useFeedbackModal } from '../use-feedback-modal';

const apiError = (message: string, auditId?: string) => {
  const config = { headers: new AxiosHeaders() };

  return new AxiosError('failed', AxiosError.ERR_BAD_REQUEST, config, null, {
    status: 409,
    statusText: '409',
    data: { message, auditId },
    headers: new AxiosHeaders(),
    config,
  });
};

const Trigger = ({ onOk }: { onOk: () => void }) => {
  const { showError, showErrorWithLink, confirmWarning } = useFeedbackModal();

  return (
    <>
      <Button onClick={() => showError(apiError('Email already in use'))}>
        fail
      </Button>
      <Button
        onClick={() => showError(apiError('Unexpected error', 'audit-123'))}
      >
        fail with reference
      </Button>
      <Button
        onClick={() =>
          showErrorWithLink(apiError('Link expired'), {
            to: '/new-link',
            state: { email: 'ada@example.com' },
            label: 'Request a new link',
          })
        }
      >
        fail with link
      </Button>
      <Button
        onClick={() =>
          confirmWarning({
            title: 'Approval required',
            content: 'Send it anyway?',
            okText: 'Send',
            onOk,
          })
        }
      >
        warn
      </Button>
    </>
  );
};

const renderTrigger = () => {
  const onOk = vi.fn<() => void>();
  const router = createMemoryRouter([
    { path: '/', element: <Trigger onOk={onOk} /> },
    { path: '/new-link', element: <p>New link page</p> },
  ]);

  render(
    <AntdApp>
      <RouterProvider router={router} />
    </AntdApp>,
  );

  return { onOk, router };
};

describe('useFeedbackModal', () => {
  it('shows the API error message in a dialog', async () => {
    renderTrigger();

    fireEvent.click(screen.getByRole('button', { name: 'fail' }));

    const dialog = await screen.findByRole('dialog', {
      name: i18n.t('feedback.error'),
    });
    expect(dialog).toHaveTextContent('Email already in use');
  });

  it('navigates with the router state when the error dialog link is followed', async () => {
    const { router } = renderTrigger();

    fireEvent.click(screen.getByRole('button', { name: 'fail with link' }));
    const dialog = await screen.findByRole('dialog', {
      name: i18n.t('feedback.error'),
    });
    expect(dialog).toHaveTextContent('Link expired');
    fireEvent.click(
      within(dialog).getByRole('link', { name: 'Request a new link' }),
    );

    expect(await screen.findByText('New link page')).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ email: 'ada@example.com' });
  });

  it('shows the audit reference in the error dialog', async () => {
    renderTrigger();

    fireEvent.click(
      screen.getByRole('button', { name: 'fail with reference' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: i18n.t('feedback.error'),
    });
    expect(dialog).toHaveTextContent('Unexpected error');
    expect(dialog).toHaveTextContent(
      i18n.t('apiErrors.auditReference', { auditId: 'audit-123' }),
    );
  });

  it('runs the action when the warning is confirmed', async () => {
    const { onOk } = renderTrigger();

    fireEvent.click(screen.getByRole('button', { name: 'warn' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Approval required',
    });
    expect(dialog).toHaveTextContent('Send it anyway?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send' }));

    expect(onOk).toHaveBeenCalledOnce();
  });

  it('does not run the action when the warning is cancelled', async () => {
    const { onOk } = renderTrigger();

    fireEvent.click(screen.getByRole('button', { name: 'warn' }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: i18n.t('common.cancel'),
      }),
    );

    expect(onOk).not.toHaveBeenCalled();
  });
});
