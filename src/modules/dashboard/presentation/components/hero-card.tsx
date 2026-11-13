import { Card, Grid, theme } from 'antd';
import type { PropsWithChildren } from 'react';

export const HeroCard = ({ children }: PropsWithChildren) => {
  const { token } = theme.useToken();
  const { md } = Grid.useBreakpoint();

  return (
    <Card
      style={{
        borderColor: token.colorBorder,
        boxShadow: token.boxShadowTertiary,
      }}
      styles={{ body: { padding: md ? token.paddingXL : token.padding } }}
    >
      {children}
    </Card>
  );
};

export const HeroBalancePanel = ({ children }: PropsWithChildren) => {
  const { token } = theme.useToken();
  const { sm } = Grid.useBreakpoint();

  return (
    <div
      style={{
        height: '100%',
        padding: sm ? token.paddingLG : token.padding,
        background: token.colorFillAlter,
        border: `${token.lineWidth}px ${token.lineType} ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
      }}
    >
      {children}
    </div>
  );
};
