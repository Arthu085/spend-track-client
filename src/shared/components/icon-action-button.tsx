import { Button, type ButtonProps, Tooltip, type TooltipProps } from 'antd';
import type { ReactNode } from 'react';
import { useActionTooltip } from './use-action-tooltip';

interface IconActionButtonProps extends Omit<
  ButtonProps,
  'aria-label' | 'children' | 'icon' | 'title'
> {
  label: string;
  icon: ReactNode;
  tooltipPlacement?: TooltipProps['placement'];
}

export const IconActionButton = ({
  label,
  icon,
  tooltipPlacement,
  disabled,
  style,
  onClick,
  onFocus,
  onBlur,
  ...props
}: IconActionButtonProps) => {
  const { tooltipProps, showOnKeyboardFocus, hide } = useActionTooltip();

  const button = (
    <Button
      {...props}
      icon={icon}
      aria-label={label}
      disabled={disabled}
      style={disabled ? { pointerEvents: 'none', ...style } : style}
      onClick={(event) => {
        hide();
        onClick?.(event);
      }}
      onFocus={(event) => {
        showOnKeyboardFocus(event);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        hide();
        onBlur?.(event);
      }}
    />
  );

  return (
    <Tooltip {...tooltipProps} title={label} placement={tooltipPlacement}>
      {disabled ? (
        <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>
          {button}
        </span>
      ) : (
        button
      )}
    </Tooltip>
  );
};
