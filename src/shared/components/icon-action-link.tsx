import { Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useActionTooltip } from './use-action-tooltip';

interface IconActionLinkProps {
  to: string;
  label: string;
  icon: ReactNode;
}

export const IconActionLink = ({ to, label, icon }: IconActionLinkProps) => {
  const { tooltipProps, showOnKeyboardFocus, hide } = useActionTooltip();

  return (
    <Tooltip {...tooltipProps} title={label}>
      <Link
        to={to}
        aria-label={label}
        onFocus={showOnKeyboardFocus}
        onBlur={hide}
        onClick={hide}
      >
        {icon}
      </Link>
    </Tooltip>
  );
};
