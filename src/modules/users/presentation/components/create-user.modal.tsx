import { useTranslation } from 'react-i18next';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { FormModal } from '@/shared/forms/form-modal';
import {
  type CreateUserForm,
  createUserFormSchema,
} from '../../domain/user-form.schemas';
import { useCreateUser } from '../../infra/users.queries';
import { UserFormFields } from './user-form-fields';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateUserModal = ({ open, onClose }: CreateUserModalProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const createMutation = useCreateUser();

  return (
    <FormModal<CreateUserForm>
      open={open}
      title={t('users.create.title')}
      submitting={createMutation.isPending}
      onSubmit={(values) => {
        createMutation.mutate(createUserFormSchema.parse(values), {
          onSuccess: onClose,
          onError: showError,
        });
      }}
      onCancel={onClose}
    >
      <UserFormFields withPassword />
    </FormModal>
  );
};
