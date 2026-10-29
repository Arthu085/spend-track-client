import { Button, theme, Tooltip } from 'antd';
import type { ReactNode } from 'react';

type SidebarActionButtonProps = {
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  text: string;
  loading?: boolean;
  onClick: () => void;
};

export const SidebarActionButton = ({
  collapsed,
  icon,
  label,
  text,
  loading,
  onClick,
}: SidebarActionButtonProps) => {
  const { token } = theme.useToken();

  return (
    <Tooltip title={collapsed ? label : undefined} placement="right">
      <Button
        type="text"
        block
        icon={icon}
        aria-label={label}
        loading={loading}
        onClick={onClick}
        style={{
          justifyContent: collapsed ? 'center' : 'flex-start',
          paddingInline: collapsed ? 0 : token.padding,
        }}
      >
        {collapsed ? null : text}
      </Button>
    </Tooltip>
  );
};
