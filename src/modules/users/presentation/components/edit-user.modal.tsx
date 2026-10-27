import { App, Flex } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage, getHttpStatus } from '@/core/http/api-error';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { hasAdminRole } from '@/modules/authorization/domain/role.schema';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import {
  type UpdateUserForm,
  updateUserFormSchema,
} from '../../domain/user-form.schemas';
import type { UserDetail } from '../../domain/user.schema';
import { useCreateChangeRequest } from '../../infra/user-change-requests.queries';
import type { UpdateUserPayload } from '../../infra/users.api';
import { useUpdateUser } from '../../infra/users.queries';
import { UserFormFields } from './user-form-fields';

interface EditUserModalProps {
  user: UserDetail | null;
  onClose: () => void;
}

const isOtherAdmin = (user: UserDetail, sessionUserUuid?: string) =>
  user.uuid !== sessionUserUuid && hasAdminRole(user.roles);

export const EditUserModal = ({ user, onClose }: EditUserModalProps) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { showError, confirmWarning } = useFeedbackModal();
  const { data: sessionUser } = useSession();
  const updateMutation = useUpdateUser();
  const changeRequestMutation = useCreateChangeRequest();

  const sendChangeRequest = (
    target: UserDetail,
    payload: UpdateUserPayload,
  ) => {
    changeRequestMutation.mutate(payload, {
      onSuccess: () => {
        message.success(t('users.changeRequest.sent', { name: target.name }));
        onClose();
      },
      onError: showError,
    });
  };

  const offerChangeRequest = (
    target: UserDetail,
    payload: UpdateUserPayload,
    error: Error,
  ) => {
    confirmWarning({
      title: t('users.changeRequest.title'),
      content: (
        <Flex vertical gap="small">
          <span>{getApiErrorMessage(error)}</span>
          <span>{t('users.changeRequest.offer', { name: target.name })}</span>
        </Flex>
      ),
      okText: t('users.changeRequest.send'),
      onOk: () => sendChangeRequest(target, payload),
    });
  };

  const handleSubmit = (values: UpdateUserForm) => {
    if (!user) {
      return;
    }
    const parsed = updateUserFormSchema.parse(values);
    const rolesChanged =
      parsed.roleUuids.length !== user.roles.length ||
      parsed.roleUuids.some(
        (uuid) => !user.roles.some((role) => role.uuid === uuid),
      );
    const payload: UpdateUserPayload = {
      uuid: user.uuid,
      name: parsed.name,
      email: parsed.email,
      ...(rolesChanged ? { roleUuids: parsed.roleUuids } : {}),
    };

    updateMutation.mutate(payload, {
      onSuccess: onClose,
      onError: (error) => {
        if (
          getHttpStatus(error) === 409 &&
          isOtherAdmin(user, sessionUser?.uuid)
        ) {
          offerChangeRequest(user, payload, error);
          return;
        }
        showError(error);
      },
    });
  };

  return (
    <FormModal<UpdateUserForm>
      open={user !== null}
      title={t('users.edit.title')}
      initialValues={
        user
          ? {
              name: user.name,
              email: user.email,
              roleUuids: user.roles.map(({ uuid }) => uuid),
            }
          : undefined
      }
      submitting={updateMutation.isPending || changeRequestMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={onClose}
    >
      <UserFormFields assignedRoles={user?.roles} />
    </FormModal>
  );
};
