import { Button, Flex, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import { zodRule } from '@/shared/forms/zod-rule';
import {
  isSameEmail,
  type UpdateOwnProfileForm,
  updateOwnProfileFormSchema,
} from '../../domain/user-form.schemas';
import type { UserDetail } from '../../domain/user.schema';
import { useUpdateOwnProfile } from '../../infra/users.queries';
import { useSessionsEndedNotification } from '../use-sessions-ended-notification';
import { AccountSectionTitle } from './account-section-title';

interface OwnProfileFormProps {
  user: UserDetail;
}

export const OwnProfileForm = ({ user }: OwnProfileFormProps) => {
  const { t } = useTranslation();
  const notifySessionsEnded = useSessionsEndedNotification();
  const { showError } = useFeedbackModal();
  const [form] = Form.useForm<UpdateOwnProfileForm>();
  const name = Form.useWatch('name', form);
  const email = Form.useWatch('email', form);
  const updateMutation = useUpdateOwnProfile();
  const emailChanged = !isSameEmail(email ?? user.email, user.email);
  const hasChanges = emailChanged || (name ?? user.name) !== user.name;
  const { shape } = updateOwnProfileFormSchema;

  const notifyProfileUpdated = () => {
    notifySessionsEnded({
      title: t('account.updated.title'),
      confirmNewEmail: emailChanged,
    });
  };

  const handleFinish = (values: UpdateOwnProfileForm) => {
    const { currentPassword, ...profile } =
      updateOwnProfileFormSchema.parse(values);

    updateMutation.mutate(
      emailChanged ? { ...profile, currentPassword } : profile,
      { onSuccess: notifyProfileUpdated, onError: showError },
    );
  };

  return (
    <Flex vertical gap="middle">
      <AccountSectionTitle>{t('account.profile.title')}</AccountSectionTitle>
      <Form<UpdateOwnProfileForm>
        aria-label={t('account.profile.title')}
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ name: user.name, email: user.email }}
        disabled={updateMutation.isPending}
        onFinish={handleFinish}
      >
        <Form.Item
          name="name"
          label={t('users.fields.name')}
          rules={[zodRule(shape.name)]}
        >
          <Input autoComplete="name" />
        </Form.Item>
        <Form.Item
          name="email"
          label={t('users.fields.email')}
          rules={[zodRule(shape.email)]}
        >
          <Input autoComplete="email" />
        </Form.Item>
        {emailChanged && (
          <Form.Item
            name="currentPassword"
            label={t('account.fields.currentPassword')}
            extra={t('account.currentPasswordHelp')}
            rules={[zodRule(shape.currentPassword.unwrap())]}
            preserve={false}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
        )}
        <Button
          type="primary"
          htmlType="submit"
          disabled={!hasChanges}
          loading={updateMutation.isPending}
        >
          {t('common.save')}
        </Button>
      </Form>
    </Flex>
  );
};
