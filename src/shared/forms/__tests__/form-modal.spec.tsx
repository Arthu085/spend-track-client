import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Form, Input } from 'antd';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { FormModal } from '../form-modal';
import { zodRule } from '../zod-rule';

interface NameForm {
  name: string;
}

const nameSchema = z.string().min(1, { error: 'Name is required' });

const renderModal = () => {
  const onSubmit = vi.fn<(values: NameForm) => void>();

  render(
    <FormModal<NameForm>
      open
      title="Edit item"
      initialValues={{ name: 'Ada' }}
      submitting={false}
      onSubmit={onSubmit}
      onCancel={() => undefined}
    >
      <Form.Item name="name" label="Name" rules={[zodRule(nameSchema)]}>
        <Input />
      </Form.Item>
    </FormModal>,
  );

  return { onSubmit };
};

const submitButton = () =>
  screen.getByRole('button', { name: i18n.t('common.save') });

describe('FormModal', () => {
  // main.tsx renders in StrictMode, whose extra unmount and remount must not clear the fields.
  it('keeps its initial values in StrictMode', () => {
    render(
      <StrictMode>
        <FormModal<NameForm>
          open
          title="Edit item"
          initialValues={{ name: 'Ada' }}
          submitting={false}
          onSubmit={() => undefined}
          onCancel={() => undefined}
        >
          <Form.Item name="name" label="Name">
            <Input />
          </Form.Item>
        </FormModal>
      </StrictMode>,
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
  });

  it('submits the form values', async () => {
    const { onSubmit } = renderModal();

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Grace' },
    });
    fireEvent.click(submitButton());

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'Grace' });
    });
  });

  it('does not submit invalid values', async () => {
    const { onSubmit } = renderModal();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.click(submitButton());

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
