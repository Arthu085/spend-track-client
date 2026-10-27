import { Descriptions, Flex, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  type Ability,
  groupAbilitiesBySubject,
} from '../../domain/ability.schema';
import { getActionLabel, getSubjectLabel } from './ability-labels';

interface AbilitySummaryProps {
  abilities: readonly Ability[];
}

export const AbilitySummary = ({ abilities }: AbilitySummaryProps) => {
  const { t } = useTranslation();
  const groups = groupAbilitiesBySubject(abilities);

  if (groups.length === 0) {
    return (
      <Typography.Text type="secondary">
        {t('authorization.noAbilities')}
      </Typography.Text>
    );
  }

  return (
    <Descriptions
      bordered
      size="small"
      column={1}
      items={groups.map(({ subject, actions }) => ({
        key: subject,
        label: getSubjectLabel(
          abilities.find((ability) => ability.subject === subject) ?? {
            subject,
          },
        ),
        children: (
          <Flex wrap gap="small">
            {actions.map((action) => (
              <Tag key={action}>
                {getActionLabel(
                  abilities.find(
                    (ability) =>
                      ability.subject === subject && ability.action === action,
                  ) ?? { action, subject },
                )}
              </Tag>
            ))}
          </Flex>
        ),
      }))}
    />
  );
};
