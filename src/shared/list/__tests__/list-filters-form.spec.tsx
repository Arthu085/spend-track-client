import { act, fireEvent, render, screen } from '@testing-library/react';
import { Form, Input } from 'antd';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import i18n from '@/core/i18n/i18n.config';
import { FILTERS_DEBOUNCE_MS, ListFiltersForm } from '../list-filters-form';
import { useListParams } from '../use-list-params';

const filterShape = { name: z.string() };

const FiltersPage = () => {
  const listParams = useListParams(filterShape);

  return (
    <ListFiltersForm listParams={listParams}>
      <Form.Item name="name" label="Name">
        <Input />
      </Form.Item>
    </ListFiltersForm>
  );
};

const renderFilters = (initialEntries: string[], initialIndex = 0) => {
  const router = createMemoryRouter(
    [{ path: '/items', Component: FiltersPage }],
    { initialEntries, initialIndex },
  );

  render(<RouterProvider router={router} />);

  return router;
};

const advanceTime = async (milliseconds: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
};

describe('list filters URL synchronization', () => {
  afterEach(() => vi.useRealTimers());

  it('debounces the latest edit, trims the URL value, and resets pagination', async () => {
    vi.useFakeTimers();
    const router = renderFilters(['/items?name=ada&page=3&limit=10']);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'gra' },
    });
    await advanceTime(FILTERS_DEBOUNCE_MS / 2);
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  grace  ' },
    });
    await advanceTime(FILTERS_DEBOUNCE_MS - 1);

    expect(router.state.location.search).toBe('?name=ada&page=3&limit=10');

    await advanceTime(1);

    expect(router.state.location.search).toBe('?name=grace&limit=10');
    expect(screen.getByLabelText('Name')).toHaveValue('  grace  ');
  });

  it.each([
    {
      direction: 'Back',
      entries: ['/items?name=ada&page=2', '/items?name=grace&page=3'],
      initialIndex: 1,
      delta: -1,
      expectedName: 'ada',
      expectedSearch: '?name=ada&page=2',
    },
    {
      direction: 'Forward',
      entries: ['/items?name=ada&page=2', '/items?name=grace&page=3'],
      initialIndex: 0,
      delta: 1,
      expectedName: 'grace',
      expectedSearch: '?name=grace&page=3',
    },
    {
      direction: 'Back with unchanged filters',
      entries: ['/items?name=ada&page=2', '/items?name=ada&page=3'],
      initialIndex: 1,
      delta: -1,
      expectedName: 'ada',
      expectedSearch: '?name=ada&page=2',
    },
    {
      direction: 'Forward with unchanged filters',
      entries: ['/items?name=ada&page=2', '/items?name=ada&page=3'],
      initialIndex: 0,
      delta: 1,
      expectedName: 'ada',
      expectedSearch: '?name=ada&page=3',
    },
  ])(
    'cancels a pending edit on $direction navigation',
    async ({ entries, initialIndex, delta, expectedName, expectedSearch }) => {
      vi.useFakeTimers();
      const router = renderFilters(entries, initialIndex);

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'pending' },
      });
      await advanceTime(FILTERS_DEBOUNCE_MS / 2);

      await act(async () => {
        await router.navigate(delta);
      });

      expect(screen.getByLabelText('Name')).toHaveValue(expectedName);
      await advanceTime(FILTERS_DEBOUNCE_MS);
      expect(router.state.location.search).toBe(expectedSearch);
      expect(screen.getByLabelText('Name')).toHaveValue(expectedName);

      fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'new' },
      });
      await advanceTime(FILTERS_DEBOUNCE_MS);

      expect(router.state.location.search).toBe('?name=new');
    },
  );

  it('cancels a pending edit when filters are cleared', async () => {
    vi.useFakeTimers();
    const router = renderFilters(['/items?name=ada&page=2']);

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'pending' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('list.filters.clear') }),
    );
    await advanceTime(FILTERS_DEBOUNCE_MS);

    expect(router.state.location.search).toBe('');
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});
