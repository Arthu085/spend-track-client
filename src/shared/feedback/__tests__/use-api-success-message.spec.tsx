import { fireEvent, render, screen } from '@testing-library/react';
import { App as AntdApp, Button } from 'antd';
import { describe, expect, it } from 'vitest';
import type { ApiMeta } from '@/core/http/api-envelope';
import i18n from '@/core/i18n/i18n.config';
import { useApiSuccessMessage } from '../use-api-success-message';

const Notifier = ({ meta }: { meta: ApiMeta }) => {
  const showSuccessMessage = useApiSuccessMessage();

  return <Button onClick={() => showSuccessMessage({ meta })}>notify</Button>;
};

const renderNotifier = (meta: ApiMeta) => {
  render(
    <AntdApp>
      <Notifier meta={meta} />
    </AntdApp>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'notify' }));
};

describe('useApiSuccessMessage', () => {
  it('shows the message localized by the API', async () => {
    renderNotifier({ message: 'Criado com sucesso' });

    expect(await screen.findByText('Criado com sucesso')).toBeInTheDocument();
  });

  it('falls back to a generic message when the API sends none', async () => {
    renderNotifier({});

    expect(
      await screen.findByText(i18n.t('feedback.success')),
    ).toBeInTheDocument();
  });
});
