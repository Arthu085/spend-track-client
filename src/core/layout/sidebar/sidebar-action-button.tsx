import { Button, theme } from 'antd';
import type { ReactNode } from 'react';
import { IconActionButton } from '@/shared/components/icon-action-button';

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

  if (collapsed) {
    return (
      <IconActionButton
        type="text"
        block
        icon={icon}
        label={label}
        tooltipPlacement="right"
        loading={loading}
        onClick={onClick}
        style={{ justifyContent: 'center', paddingInline: 0 }}
      />
    );
  }

  return (
    <Button
      type="text"
      block
      icon={icon}
      aria-label={label}
      loading={loading}
      onClick={onClick}
      style={{ justifyContent: 'flex-start', paddingInline: token.padding }}
    >
      {text}
    </Button>
  );
};
