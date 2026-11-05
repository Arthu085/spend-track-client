import type { FocusEvent } from 'react';
import { useState } from 'react';

export const useActionTooltip = () => {
  const [open, setOpen] = useState(false);

  return {
    tooltipProps: { open, onOpenChange: setOpen, trigger: 'hover' as const },
    showOnKeyboardFocus: ({ currentTarget }: FocusEvent<HTMLElement>) => {
      if (currentTarget.matches(':focus-visible')) {
        setOpen(true);
      }
    },
    hide: () => setOpen(false),
  };
};
