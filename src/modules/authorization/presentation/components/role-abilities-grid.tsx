import { Checkbox, Table, type TableColumnsType } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  type Ability,
  groupAbilitiesBySubject,
  hasAbility,
  type SubjectAbilities,
  toggleAbility,
} from '../../domain/ability.schema';
import { getActionLabel, getSubjectLabel } from './ability-labels';

interface RoleAbilitiesGridProps {
  catalog: readonly Ability[];
  value: readonly Ability[];
  disabled: boolean;
  onChange: (abilities: Ability[]) => void;
}

export const RoleAbilitiesGrid = ({
  catalog,
  value,
  disabled,
  onChange,
}: RoleAbilitiesGridProps) => {
  const { t } = useTranslation();

  const actions = [...new Set(catalog.map(({ action }) => action))];
  const actionLabel = (action: string) =>
    getActionLabel(
      catalog.find((ability) => ability.action === action) ?? {
        action,
      },
    );
  const subjectLabel = (subject: string) =>
    getSubjectLabel(
      catalog.find((ability) => ability.subject === subject) ?? {
        subject,
      },
    );

  const columns: TableColumnsType<SubjectAbilities> = [
    {
      title: t('roles.fields.subject'),
      dataIndex: 'subject',
      render: (_, { subject }) => subjectLabel(subject),
    },
    ...actions.map((action) => ({
      title: actionLabel(action),
      key: action,
      align: 'center' as const,
      render: (_: unknown, { subject, actions }: SubjectAbilities) =>
        actions.includes(action) && (
          <Checkbox
            aria-label={t('roles.abilities.cell', {
              action: actionLabel(action),
              subject: subjectLabel(subject),
            })}
            checked={hasAbility(value, { action, subject })}
            disabled={disabled}
            onChange={({ target }) =>
              onChange(
                toggleAbility(value, { action, subject }, target.checked),
              )
            }
          />
        ),
    })),
  ];

  return (
    <Table
      bordered
      size="small"
      rowKey="subject"
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={columns}
      dataSource={groupAbilitiesBySubject(catalog)}
    />
  );
};
