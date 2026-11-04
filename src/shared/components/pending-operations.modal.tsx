import { Button, Flex, Modal, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type {
  PendingOperations,
  PendingOperationsDecision,
} from '@/shared/domain/pending-operations.schema';
import { formatMoney } from '@/shared/money/money';

interface PendingOperationsModalProps {
  open: boolean;
  name?: string;
  pendingOperations?: PendingOperations;
  decision?: PendingOperationsDecision;
  description: string;
  keepHint: string;
  cancelHint: string;
  onDecide: (decision: PendingOperationsDecision) => void;
  onClose: () => void;
}

export const PendingOperationsModal = ({
  open,
  name,
  pendingOperations,
  decision,
  description,
  keepHint,
  cancelHint,
  onDecide,
  onClose,
}: PendingOperationsModalProps) => {
  const { t, i18n } = useTranslation();
  const deciding = decision !== undefined;

  return (
    <Modal
      open={open}
      title={t('pendingOperations.title', { name })}
      onCancel={onClose}
      closable={{ disabled: deciding }}
      keyboard={!deciding}
      mask={{ closable: !deciding }}
      destroyOnHidden
      footer={
        <Flex wrap gap="small" justify="end">
          <Button disabled={deciding} onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button
            danger
            loading={decision === 'CANCEL'}
            disabled={decision === 'KEEP'}
            onClick={() => onDecide('CANCEL')}
          >
            {t('pendingOperations.cancel')}
          </Button>
          <Button
            type="primary"
            loading={decision === 'KEEP'}
            disabled={decision === 'CANCEL'}
            onClick={() => onDecide('KEEP')}
          >
            {t('pendingOperations.keep')}
          </Button>
        </Flex>
      }
    >
      {pendingOperations && (
        <Flex vertical gap="small">
          <Typography.Text strong>
            {t('pendingOperations.summary', {
              count: pendingOperations.count,
              total: formatMoney(pendingOperations.total, i18n.language),
            })}
          </Typography.Text>
          <Typography.Text>{description}</Typography.Text>
          <Typography.Text type="secondary">{keepHint}</Typography.Text>
          <Typography.Text type="secondary">{cancelHint}</Typography.Text>
        </Flex>
      )}
    </Modal>
  );
};
