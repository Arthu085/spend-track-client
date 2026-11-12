import { Card, Col, Flex, Grid, Row, Skeleton, theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { EqualHeightCard } from '@/shared/components/equal-height-card';

const figureSpan = { xs: 24, md: 12, xl: 8 };

const TitledCardSkeleton = () => (
  <EqualHeightCard loading title={<Skeleton.Input active size="small" />} />
);

const HeroSkeleton = () => {
  const { token } = theme.useToken();

  return (
    <Card>
      <Row gutter={[24, 24]}>
        <Col {...figureSpan}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Col>
        <Col {...figureSpan}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Col>
        <Col xs={24} xl={8}>
          <div
            style={{
              padding: token.padding,
              background: token.colorFillAlter,
              borderRadius: token.borderRadiusLG,
            }}
          >
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        </Col>
      </Row>
    </Card>
  );
};

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
