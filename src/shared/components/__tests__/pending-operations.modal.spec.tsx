import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import i18n from '@/core/i18n/i18n.config';
import type { PendingOperationsDecision } from '@/shared/domain/pending-operations.schema';
import { PendingOperationsModal } from '../pending-operations.modal';

const renderModal = (decision?: PendingOperationsDecision) => {
  const onDecide = vi.fn<(decision: PendingOperationsDecision) => void>();
  const onClose = vi.fn<() => void>();

  render(
    <PendingOperationsModal
      open
      name="Visa"
      pendingOperations={{ count: 2, total: '111.80' }}
      decision={decision}
      description="Description"
      keepHint="Keep hint"
      cancelHint="Cancel hint"
      onDecide={onDecide}
      onClose={onClose}
    />,
  );

  const footerButton = (name: string) => {
    const [button] = within(screen.getByRole('dialog'))
      .getAllByRole('button', { name })
      .filter(({ textContent }) => textContent === name);

    return button;
  };

  return { onDecide, onClose, footerButton };
};

describe('PendingOperationsModal', () => {
  it('reports the decision the user picks', () => {
    const { onDecide, footerButton } = renderModal();

    fireEvent.click(footerButton(i18n.t('pendingOperations.keep')));
    fireEvent.click(footerButton(i18n.t('pendingOperations.cancel')));

    expect(onDecide.mock.calls).toEqual([['KEEP'], ['CANCEL']]);
  });

  it('closes without deciding', () => {
    const { onClose, onDecide, footerButton } = renderModal();

    fireEvent.click(footerButton(i18n.t('common.close')));

    expect(onClose).toHaveBeenCalled();
    expect(onDecide).not.toHaveBeenCalled();
  });

  it('blocks the other choices while a decision is being applied', () => {
    const { footerButton } = renderModal('CANCEL');

    expect(footerButton(i18n.t('common.close'))).toBeDisabled();
    expect(footerButton(i18n.t('pendingOperations.keep'))).toBeDisabled();
  });
});
