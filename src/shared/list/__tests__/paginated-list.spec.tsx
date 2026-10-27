import {
  keepPreviousData,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { Form, Input } from 'antd';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createQueryClient } from '@/core/config/query-client.config';
import { parsePaginatedResponse } from '@/core/http/api-envelope';
import { httpClient } from '@/core/http/http-client';
import i18n from '@/core/i18n/i18n.config';
import { recordStatusSchema } from '@/shared/domain/record-status.schema';
import { RecordStatusSelect } from '@/shared/forms/record-status-select';
import { stubHttpRoutes } from '@/test/http-stub';
import { ListFiltersForm } from '../list-filters-form';
import { PaginatedTable } from '../paginated-table';
import { useListParams } from '../use-list-params';

const itemSchema = z.object({ uuid: z.string(), name: z.string() });

const filterShape = { name: z.string().max(10), status: recordStatusSchema };

const ItemsPage = () => {
  const listParams = useListParams(filterShape);
  const { page, limit, filters } = listParams;
  const query = useQuery({
    queryKey: ['items', { page, limit, ...filters }],
    queryFn: async () => {
      const response = await httpClient.get<unknown>('/items', {
        params: { page, limit, ...filters },
      });

      return parsePaginatedResponse(itemSchema, response.data);
    },
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <ListFiltersForm listParams={listParams}>
        <Form.Item name="name" label="Name">
          <Input />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <RecordStatusSelect allowClear />
        </Form.Item>
      </ListFiltersForm>
      <PaginatedTable
        query={query}
        listParams={listParams}
        rowKey="uuid"
        columns={[{ title: 'Name', dataIndex: 'name' }]}
      />
    </>
  );
};

const itemsResponse = (total: number, page: number, limit: number) => ({
  status: 200,
  data: {
    data: [{ uuid: `item-${page}`, name: `Item on page ${page}` }],
    meta: { total, page, limit },
  },
});

const renderItems = (path: string) => {
  const requests = stubHttpRoutes(httpClient, {
    'GET /items': (config) => {
      const { page, limit } = z
        .object({ page: z.number(), limit: z.number() })
        .parse(config.params);

      return itemsResponse(45, page, limit);
    },
  });
  const router = createMemoryRouter(
    [{ path: '/items', Component: ItemsPage }],
    {
      initialEntries: [path],
    },
  );

  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return {
    router,
    lastParams: (): unknown => requests.at(-1)?.params,
  };
};

describe('paginated list', () => {
  it('requests the page, limit, and filters from the URL', async () => {
    const { lastParams } = renderItems(
      '/items?page=2&limit=10&name=ada&status=ACTIVE',
    );

    expect(await screen.findByText('Item on page 2')).toBeInTheDocument();
    expect(lastParams()).toEqual({
      page: 2,
      limit: 10,
      name: 'ada',
      status: 'ACTIVE',
    });
    expect(
      screen.getByText(i18n.t('list.total', { count: 45 })),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('ada');
  });

  it('ignores invalid URL values and uses the defaults', async () => {
    const { lastParams } = renderItems(
      '/items?page=abc&limit=500&name=far-too-long-name&status=DELETED',
    );

    expect(await screen.findByText('Item on page 1')).toBeInTheDocument();
    expect(lastParams()).toEqual({ page: 1, limit: 20 });
  });

  it('moves to another page through the URL', async () => {
    const { router, lastParams } = renderItems('/items?name=ada');

    await screen.findByText('Item on page 1');
    fireEvent.click(screen.getByTitle('2'));

    expect(await screen.findByText('Item on page 2')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?name=ada&page=2');
    expect(lastParams()).toEqual({ page: 2, limit: 20, name: 'ada' });
  });

  it('applies trimmed filters as they change, from the first page, and clears them', async () => {
    const { router, lastParams } = renderItems('/items?page=3');

    await screen.findByText('Item on page 3');
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  gra' },
    });
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: '  grace  ' },
    });

    await waitFor(() => {
      expect(router.state.location.search).toBe('?name=grace');
    });
    expect(await screen.findByText('Item on page 1')).toBeInTheDocument();
    expect(lastParams()).toEqual({ page: 1, limit: 20, name: 'grace' });
    // The typed value keeps its spaces while the URL holds the trimmed filter.
    expect(screen.getByLabelText('Name')).toHaveValue('  grace  ');
    expect(within(screen.getByRole('search')).getAllByRole('button')).toEqual([
      screen.getByRole('button', { name: i18n.t('list.filters.clear') }),
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: i18n.t('list.filters.clear') }),
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});
