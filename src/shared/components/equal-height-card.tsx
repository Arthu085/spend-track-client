import { Card, type CardProps } from 'antd';

export const EqualHeightCard = ({ style, ...props }: CardProps) => (
  <Card {...props} style={{ height: '100%', ...style }} />
);
