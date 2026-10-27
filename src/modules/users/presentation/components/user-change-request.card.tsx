import { Button, Card, Flex, Popconfirm, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import type { UserChangeRequest } from '../../domain/user-change-request.schema';
import { UserChangeRequestDiffTable } from './user-change-request-diff.table';

interface UserChangeRequestCardProps {
  request: UserChangeRequest;
  busy: boolean;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export const UserChangeRequestCard = ({
  request,
  busy,
  approving,
  rejecting,
  onApprove,
  onReject,
}: UserChangeRequestCardProps) => {
  const { t, i18n } = useTranslation();
  const dateTimeFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <Card
      title={t('changeRequests.requestedBy', {
        name: request.requesterName ?? t('changeRequests.unknownRequester'),
      })}
    >
      <Flex vertical gap="middle">
        <Typography.Text type="secondary">
          {t('changeRequests.dates', {
            createdAt: dateTimeFormat.format(new Date(request.createdAt)),
            expiresAt: dateTimeFormat.format(new Date(request.expiresAt)),
          })}
        </Typography.Text>
        <UserChangeRequestDiffTable request={request} />
        <Flex gap="small" justify="flex-end">
          <Popconfirm
            title={t('changeRequests.reject.title')}
            description={t('changeRequests.reject.description')}
            okText={t('changeRequests.reject.submit')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true }}
            disabled={busy}
            onConfirm={onReject}
          >
            <Button danger loading={rejecting} disabled={busy && !rejecting}>
              {t('changeRequests.reject.submit')}
            </Button>
          </Popconfirm>
          <Popconfirm
            title={t('changeRequests.approve.title')}
            description={t('changeRequests.approve.description')}
            okText={t('changeRequests.approve.submit')}
            cancelText={t('common.cancel')}
            disabled={busy}
            onConfirm={onApprove}
          >
            <Button
              type="primary"
              loading={approving}
              disabled={busy && !approving}
            >
              {t('changeRequests.approve.submit')}
            </Button>
          </Popconfirm>
        </Flex>
      </Flex>
    </Card>
  );
};
