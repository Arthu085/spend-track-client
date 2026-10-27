import { Alert, Empty, Flex, Skeleton, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import type { UserChangeRequest } from '../../domain/user-change-request.schema';
import { isSameEmail } from '../../domain/user-form.schemas';
import {
  useApproveChangeRequest,
  useOwnChangeRequests,
  useRejectChangeRequest,
} from '../../infra/user-change-requests.queries';
import { UserChangeRequestCard } from '../components/user-change-request.card';
import { useSessionsEndedNotification } from '../use-sessions-ended-notification';

export const ChangeRequestsPage = () => {
  const { t } = useTranslation();
  const notifySessionsEnded = useSessionsEndedNotification();
  const { showError } = useFeedbackModal();
  const changeRequestsQuery = useOwnChangeRequests();
  const approveMutation = useApproveChangeRequest();
  const rejectMutation = useRejectChangeRequest();
  const busy = approveMutation.isPending || rejectMutation.isPending;

  const notifyApproved = ({ current, requested }: UserChangeRequest) => {
    notifySessionsEnded({
      title: t('changeRequests.approve.done'),
      confirmNewEmail: !isSameEmail(current.email, requested.email),
    });
  };

  const approve = (request: UserChangeRequest) => {
    approveMutation.mutate(request.uuid, {
      onSuccess: () => notifyApproved(request),
      onError: showError,
    });
  };

  const reject = ({ uuid }: UserChangeRequest) => {
    rejectMutation.mutate(uuid, { onError: showError });
  };

  return (
    <Flex vertical gap="middle">
      <Typography.Title level={2}>{t('changeRequests.title')}</Typography.Title>
      <Typography.Text type="secondary">
        {t('changeRequests.description')}
      </Typography.Text>
      {changeRequestsQuery.isPending && <Skeleton active />}
      {changeRequestsQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={getApiErrorMessage(changeRequestsQuery.error)}
        />
      )}
      {changeRequestsQuery.data?.length === 0 && (
        <Empty description={t('changeRequests.empty')} />
      )}
      {changeRequestsQuery.data?.map((request) => (
        <UserChangeRequestCard
          key={request.uuid}
          request={request}
          busy={busy}
          approving={
            approveMutation.isPending &&
            approveMutation.variables === request.uuid
          }
          rejecting={
            rejectMutation.isPending &&
            rejectMutation.variables === request.uuid
          }
          onApprove={() => approve(request)}
          onReject={() => reject(request)}
        />
      ))}
    </Flex>
  );
};
