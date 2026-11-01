import { useState } from 'react';

interface ModalTargetState<T> {
  open: boolean;
  target?: T;
}

export const useModalTarget = <T>() => {
  const [{ open, target }, setState] = useState<ModalTargetState<T>>({
    open: false,
  });

  return {
    open,
    target,
    show: (next?: T) => setState({ open: true, target: next }),
    close: () => setState((current) => ({ ...current, open: false })),
  };
};
