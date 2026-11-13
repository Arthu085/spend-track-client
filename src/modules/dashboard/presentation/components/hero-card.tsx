import { Card, type CardProps, Grid, theme } from 'antd';
import type { PropsWithChildren } from 'react';

export const HeroCard = ({ style, ...props }: Omit<CardProps, 'styles'>) => {
  const { token } = theme.useToken();
  const { md } = Grid.useBreakpoint();

  return (
    <Card
      {...props}
      style={{
        borderColor: token.colorBorder,
        boxShadow: token.boxShadowTertiary,
        ...style,
      }}
      styles={{ body: { padding: md ? token.paddingXL : token.padding } }}
    />
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
