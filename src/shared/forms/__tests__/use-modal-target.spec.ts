import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useModalTarget } from '../use-modal-target';

describe('useModalTarget', () => {
  it('starts closed without a target', () => {
    const { result } = renderHook(() => useModalTarget<string>());

    expect(result.current).toMatchObject({ open: false, target: undefined });
  });

  it('keeps the target while the modal closes and replaces it on the next opening', () => {
    const { result } = renderHook(() => useModalTarget<string>());

    act(() => result.current.show('first-record'));
    expect(result.current).toMatchObject({
      open: true,
      target: 'first-record',
    });

    act(() => result.current.close());
    expect(result.current).toMatchObject({
      open: false,
      target: 'first-record',
    });

    act(() => result.current.show('second-record'));
    expect(result.current).toMatchObject({
      open: true,
      target: 'second-record',
    });
  });

  it('clears the previous target when opened without one', () => {
    const { result } = renderHook(() => useModalTarget<string>());

    act(() => result.current.show('first-record'));
    act(() => result.current.close());
    act(() => result.current.show());

    expect(result.current).toMatchObject({ open: true, target: undefined });
  });
});
