import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { Card, type CardProps, Flex } from 'antd';
import { type ComponentType, type ReactNode, use, useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { DashboardCard } from '@/modules/preferences/domain/preferences.schema';
import { IconActionButton } from '@/shared/components/icon-action-button';
import { CollapsedCardsContext } from './collapsed-cards';

interface CollapsibleCardProps {
  card: DashboardCard;
  title: string;
  extra?: ReactNode;
  children?: ReactNode;
  component?: ComponentType<CardProps>;
}

export const CollapsibleCard = ({
  card,
  title,
  extra,
  children,
  component: CardComponent = Card,
}: CollapsibleCardProps) => {
  const { t } = useTranslation();
  const bodyId = useId();
  const collapsedCards = use(CollapsedCardsContext);
  const collapsed = collapsedCards?.isCollapsed(card) ?? false;

  const toggle = collapsedCards && (
    <IconActionButton
      type="text"
      size="small"
      icon={collapsed ? <DownOutlined /> : <UpOutlined />}
      label={t(`dashboard.cards.${collapsed ? 'expand' : 'collapse'}`, {
        title,
      })}
      aria-expanded={!collapsed}
      aria-controls={collapsed ? undefined : bodyId}
      onClick={() => collapsedCards.toggle(card)}
    />
  );

  return (
    <CardComponent
      title={title}
      extra={
        (extra || toggle) && (
          <Flex align="center" gap="small">
            {extra}
            {toggle}
          </Flex>
        )
      }
      style={collapsed ? { height: 'auto' } : undefined}
    >
      {collapsed ? null : <div id={bodyId}>{children}</div>}
    </CardComponent>
  );
};
