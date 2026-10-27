import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Role } from '@/modules/authorization/domain/role.schema';
import { RoleSelect } from '@/modules/authorization/presentation/components/role-select';
import { zodRule } from '@/shared/forms/zod-rule';
import { createUserFormSchema } from '../../domain/user-form.schemas';

interface UserFormFieldsProps {
  withPassword?: boolean;
  assignedRoles?: readonly Role[];
}

export const UserFormFields = ({
  withPassword = false,
  assignedRoles,
}: UserFormFieldsProps) => {
  const { t } = useTranslation();
  const { shape } = createUserFormSchema;

  return (
    <>
      <Form.Item
        name="name"
        label={t('users.fields.name')}
        rules={[zodRule(shape.name)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      <Form.Item
        name="email"
        label={t('users.fields.email')}
        rules={[zodRule(shape.email)]}
      >
        <Input autoComplete="off" />
      </Form.Item>
      {withPassword && (
        <Form.Item
          name="password"
          label={t('users.fields.password')}
          rules={[zodRule(shape.password)]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      )}
      <Form.Item
        name="roleUuids"
        label={t('users.fields.roles')}
        rules={[zodRule(shape.roleUuids)]}
      >
        <RoleSelect mode="multiple" assignedRoles={assignedRoles} />
      </Form.Item>
    </>
  );
};
