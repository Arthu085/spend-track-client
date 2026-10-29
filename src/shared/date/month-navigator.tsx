import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMonthLabel, type MonthRef, shiftMonth } from './month-ref';

interface MonthNavigatorProps {
  value: MonthRef;
  current: MonthRef;
  onChange: (month: MonthRef) => void;
  children?: ReactNode;
}

const isSameMonth = (left: MonthRef, right: MonthRef) =>
  left.year === right.year && left.month === right.month;

export const MonthNavigator = ({
  value,
  current,
  onChange,
  children,
}: MonthNavigatorProps) => {
  const { t, i18n } = useTranslation();

  return (
    <Flex align="center" gap="small" wrap>
      <Button
        icon={<LeftOutlined />}
        aria-label={t('month.previous')}
        onClick={() => onChange(shiftMonth(value, -1))}
      />
      <Typography.Title
        level={4}
        style={{ margin: 0, minWidth: 180, textAlign: 'center' }}
      >
        {formatMonthLabel(value, i18n.language)}
      </Typography.Title>
      <Button
        icon={<RightOutlined />}
        aria-label={t('month.next')}
        onClick={() => onChange(shiftMonth(value, 1))}
      />
      {children}
      {!isSameMonth(value, current) && (
        <Button type="link" onClick={() => onChange(current)}>
          {t('month.current')}
        </Button>
      )}
    </Flex>
  );
};
