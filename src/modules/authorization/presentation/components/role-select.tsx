import { Alert, Flex, Select, Spin, type SelectProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { useSession } from '@/modules/auth/infra/auth.queries';
import { hasAbility } from '../../domain/ability.schema';
import type { Role } from '../../domain/role.schema';
import { useAbilities } from '../../infra/abilities.queries';
import { useRoles } from '../../infra/roles.queries';

interface RoleSelectProps extends Omit<
  SelectProps<string | string[]>,
  'options' | 'loading'
> {
  includeInactive?: boolean;
  assignedRoles?: readonly Role[];
}

export const RoleSelect = ({
  includeInactive = false,
  assignedRoles = [],
  disabled,
  value,
  ...props
}: RoleSelectProps) => {
  const { t } = useTranslation();
  const { data: sessionUser } = useSession();
  const abilitiesQuery = useAbilities();
  const canReadRoles = hasAbility(abilitiesQuery.data ?? [], {
    action: 'READ',
    subject: 'ROLE',
  });
  const rolesQuery = useRoles({ enabled: canReadRoles });
  const loading =
    abilitiesQuery.isPending || (canReadRoles && rolesQuery.isPending);
  const error =
    abilitiesQuery.error ?? (canReadRoles ? rolesQuery.error : null);
  const knownRoles = [...(sessionUser?.roles ?? []), ...assignedRoles];
  const availableRoles = canReadRoles ? (rolesQuery.data ?? []) : knownRoles;
  const roles = new Map(
    [...assignedRoles, ...availableRoles].map((role) => [role.uuid, role]),
  );
  const assigned = new Set(assignedRoles.map(({ uuid }) => uuid));
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const options = [...roles.values()]
    .filter(
      ({ uuid, status }) =>
        includeInactive ||
        status === 'ACTIVE' ||
        (assigned.has(uuid) && selected.has(uuid)),
    )
    .map(({ uuid, roleLabel, status, statusLabel }) => ({
      value: uuid,
      label:
        status === 'INACTIVE' ? `${roleLabel} (${statusLabel})` : roleLabel,
    }));

  return (
    <Flex vertical gap="small">
      <Select<string | string[]>
        {...props}
        value={value}
        disabled={disabled || loading || !!error}
        loading={loading}
        status={error ? 'error' : props.status}
        options={options}
        notFoundContent={loading ? <Spin size="small" /> : undefined}
      />
      {error ? (
        <Alert type="error" showIcon title={getApiErrorMessage(error)} />
      ) : !loading && !canReadRoles ? (
        <Alert type="info" showIcon title={t('roles.select.limited')} />
      ) : null}
    </Flex>
  );
};
