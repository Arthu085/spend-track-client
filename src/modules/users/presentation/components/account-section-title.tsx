import { theme, Typography } from 'antd';
import type { ReactNode } from 'react';

interface AccountSectionTitleProps {
  children: ReactNode;
}

export const AccountSectionTitle = ({ children }: AccountSectionTitleProps) => {
  const { token } = theme.useToken();

  return (
    <Typography.Title
      level={3}
      style={{
        fontSize: token.fontSizeHeading4,
        lineHeight: token.lineHeightHeading4,
      }}
    >
      {children}
    </Typography.Title>
  );
};
