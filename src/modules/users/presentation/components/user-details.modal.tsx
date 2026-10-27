import { Descriptions, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { RoleTags } from '@/modules/authorization/presentation/components/role-tags';
import type { UserDetail } from '../../domain/user.schema';

interface UserDetailsModalProps {
  user: UserDetail | null;
  onClose: () => void;
}

export const UserDetailsModal = ({ user, onClose }: UserDetailsModalProps) => {
  const { t, i18n } = useTranslation();
  const dateTimeFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const formatDateTime = (value: string | null) =>
    value ? dateTimeFormat.format(new Date(value)) : '-';

  return (
    <Modal
      open={user !== null}
      title={t('users.details.title')}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
    >
      {user && (
        <Descriptions
          column={1}
          size="small"
          items={[
            { label: t('users.fields.name'), children: user.name },
            { label: t('users.fields.email'), children: user.email },
            {
              label: t('users.fields.roles'),
              children: <RoleTags roles={user.roles} />,
            },
            { label: t('users.fields.status'), children: user.statusLabel },
            {
              label: t('users.fields.emailConfirmedAt'),
              children: formatDateTime(user.emailConfirmedAt),
            },
            {
              label: t('users.fields.createdBy'),
              children: user.creatorName ?? '-',
            },
            {
              label: t('users.fields.createdAt'),
              children: formatDateTime(user.createdAt),
            },
            {
              label: t('users.fields.updatedBy'),
              children: user.updaterName ?? '-',
            },
            {
              label: t('users.fields.updatedAt'),
              children: formatDateTime(user.updatedAt),
            },
          ]}
        />
      )}
    </Modal>
  );
};
