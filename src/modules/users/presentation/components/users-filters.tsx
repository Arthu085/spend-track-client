import { Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { EMAIL_MAX_LENGTH } from '@/modules/auth/domain/auth.schemas';
import { hasAbility } from '@/modules/authorization/domain/ability.schema';
import { useAbilities } from '@/modules/authorization/infra/abilities.queries';
import { RoleSelect } from '@/modules/authorization/presentation/components/role-select';
import { RecordStatusSelect } from '@/shared/forms/record-status-select';
import { ListFiltersForm } from '@/shared/list/list-filters-form';
import type { ListParams } from '@/shared/list/use-list-params';
import {
  USER_NAME_MAX_LENGTH,
  type userFiltersShape,
} from '../../domain/user-form.schemas';

interface UsersFiltersProps {
  listParams: ListParams<typeof userFiltersShape>;
}

export const UsersFilters = ({ listParams }: UsersFiltersProps) => {
  const { t } = useTranslation();
  const { data: abilities = [] } = useAbilities();
  const canReadRoles = hasAbility(abilities, {
    action: 'READ',
    subject: 'ROLE',
  });

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="name" label={t('users.fields.name')}>
        <Input maxLength={USER_NAME_MAX_LENGTH} />
      </Form.Item>
      <Form.Item name="email" label={t('users.fields.email')}>
        <Input maxLength={EMAIL_MAX_LENGTH} />
      </Form.Item>
      {canReadRoles && (
        <Form.Item name="role" label={t('users.fields.role')}>
          <RoleSelect allowClear includeInactive />
        </Form.Item>
      )}
      <Form.Item name="status" label={t('users.fields.status')}>
        <RecordStatusSelect />
      </Form.Item>
    </ListFiltersForm>
  );
};
