import { Alert, Button, Flex, Modal, Skeleton } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/core/http/api-error';
import { useFeedbackModal } from '@/shared/feedback/use-feedback-modal';
import {
  type Ability,
  hasAbility,
  isSameAbilitySet,
} from '../../domain/ability.schema';
import { isAdminRole, type Role } from '../../domain/role.schema';
import { useAbilities, useAbilityCatalog } from '../../infra/abilities.queries';
import { useRole, useUpdateRoleAbilities } from '../../infra/roles.queries';
import { RoleAbilitiesGrid } from './role-abilities-grid';

interface RoleAbilitiesModalProps {
  role: Role | null;
  onClose: () => void;
}

export const RoleAbilitiesModal = ({
  role,
  onClose,
}: RoleAbilitiesModalProps) => (
  <Modal
    open={role !== null}
    title={role?.roleLabel}
    footer={null}
    onCancel={onClose}
    destroyOnHidden
    width={640}
  >
    {role && <RoleAbilitiesContent role={role} onClose={onClose} />}
  </Modal>
);

interface RoleAbilitiesContentProps {
  role: Role;
  onClose: () => void;
}

const RoleAbilitiesContent = ({ role, onClose }: RoleAbilitiesContentProps) => {
  const { t } = useTranslation();
  const { showError } = useFeedbackModal();
  const { data: ownAbilities = [] } = useAbilities();
  const canReadCatalog = hasAbility(ownAbilities, {
    action: 'READ',
    subject: 'ABILITY',
  });
  const roleQuery = useRole(role.uuid);
  const catalogQuery = useAbilityCatalog({ enabled: canReadCatalog });
  const updateMutation = useUpdateRoleAbilities();
  const [selection, setSelection] = useState<Ability[]>();

  const isAdmin = isAdminRole(role);
  const editable =
    canReadCatalog &&
    !isAdmin &&
    hasAbility(ownAbilities, { action: 'UPDATE', subject: 'ROLE' }) &&
    hasAbility(ownAbilities, { action: 'READ', subject: 'ROLE' });
  const catalog = canReadCatalog
    ? catalogQuery.data
    : roleQuery.data?.abilities;
  const loadError =
    roleQuery.error ?? (canReadCatalog ? catalogQuery.error : null);

  if (loadError) {
    return (
      <Alert type="error" showIcon title={getApiErrorMessage(loadError)} />
    );
  }

  if (!roleQuery.data || !catalog) {
    return <Skeleton active />;
  }

  const granted = roleQuery.data.abilities;
  const value = selection ?? granted;
  const changed = !isSameAbilitySet(value, granted);

  const save = () => {
    updateMutation.mutate(
      { uuid: role.uuid, abilities: value },
      { onSuccess: onClose, onError: showError },
    );
  };

  return (
    <Flex vertical gap="middle">
      {!canReadCatalog && (
        <Alert
          type="info"
          showIcon
          title={t('roles.abilities.catalogRestricted')}
        />
      )}
      {isAdmin && (
        <Alert
          type="info"
          showIcon
          title={t('roles.abilities.adminImmutable')}
        />
      )}
      <RoleAbilitiesGrid
        catalog={catalog}
        value={value}
        disabled={!editable || updateMutation.isPending}
        onChange={setSelection}
      />
      {editable && (
        <Flex justify="end" gap="small">
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="primary"
            disabled={!changed}
            loading={updateMutation.isPending}
            onClick={save}
          >
            {t('common.save')}
          </Button>
        </Flex>
      )}
    </Flex>
  );
};
