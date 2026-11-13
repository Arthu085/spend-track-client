import { Col, Flex, Grid, Row, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { EqualHeightCard } from '@/shared/components/equal-height-card';
import { HeroBalancePanel, HeroCard } from './hero-card';
import { heroLayout } from './hero-layout';

const TitledCardSkeleton = () => (
  <EqualHeightCard loading title={<Skeleton.Input active size="small" />} />
);

const HeroSkeleton = () => (
  <HeroCard>
    <Row gutter={[32, 24]}>
      <Col {...heroLayout.guidance}>
        <Row gutter={[24, 24]}>
          <Col {...heroLayout.figure}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Col>
          <Col {...heroLayout.figure}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Col>
        </Row>
      </Col>
      <Col {...heroLayout.balances}>
        <HeroBalancePanel>
          <Skeleton active paragraph={{ rows: 3 }} />
        </HeroBalancePanel>
      </Col>
    </Row>
  </HeroCard>
);

export const DashboardControlsSkeleton = () => {
  const { md } = Grid.useBreakpoint();

  return (
    <Flex
      vertical={!md}
      justify="space-between"
      align={md ? 'center' : 'start'}
      gap="middle"
      aria-hidden
    >
      <Flex align="center" gap="small">
        <Skeleton.Button active shape="circle" />
        <Skeleton.Input active />
        <Skeleton.Button active shape="circle" />
      </Flex>
      <Skeleton.Input active />
    </Flex>
  );
};

export const DashboardSkeleton = () => {
  const { t } = useTranslation();

  return (
    <Flex
      vertical
      gap="large"
      role="status"
      aria-busy="true"
      aria-label={t('dashboard.loading')}
    >
      <HeroSkeleton />
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} md={12}>
          <EqualHeightCard loading />
        </Col>
        <Col xs={24} md={12}>
          <EqualHeightCard loading />
        </Col>
      </Row>
      <TitledCardSkeleton />
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={14}>
          <TitledCardSkeleton />
        </Col>
        <Col xs={24} xl={10}>
          <TitledCardSkeleton />
        </Col>
      </Row>
      <TitledCardSkeleton />
    </Flex>
  );
};
