import { fireEvent, render, screen } from '@testing-library/react';
import { App as AntdApp, Button, Modal } from 'antd';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '../app-providers';

const ConfirmTrigger = () => {
  const { modal } = AntdApp.useApp();

  return (
    <Button
      onClick={() => {
        modal.warning({ title: 'Warning' });
      }}
    >
      Open warning
    </Button>
  );
};

describe('AppProviders', () => {
  it('centers component modals', async () => {
    render(
      <AppProviders>
        <Modal open title="Details" />
      </AppProviders>,
    );

    const dialog = await screen.findByRole('dialog');

    expect(dialog.closest('.ant-modal-wrap')).toHaveClass('ant-modal-centered');
  });

  it('centers modals opened through the App hook', async () => {
    render(
      <AppProviders>
        <ConfirmTrigger />
      </AppProviders>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open warning' }));
    const dialog = await screen.findByRole('dialog');

    expect(dialog.closest('.ant-modal-wrap')).toHaveClass('ant-modal-centered');
  });
});
