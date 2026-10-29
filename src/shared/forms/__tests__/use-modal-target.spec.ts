import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useModalTarget } from '../use-modal-target';

describe('useModalTarget', () => {
  it('keeps the target while the modal closes and replaces it on the next opening', () => {
    const { result } = renderHook(() => useModalTarget<string>());

    act(() => result.current.show('rent'));
    expect(result.current).toMatchObject({ open: true, target: 'rent' });

    act(() => result.current.close());
    expect(result.current).toMatchObject({ open: false, target: 'rent' });

    act(() => result.current.show());
    expect(result.current).toMatchObject({ open: true, target: undefined });
  });
});
