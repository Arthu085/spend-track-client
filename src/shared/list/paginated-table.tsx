import type { UseQueryResult } from '@tanstack/react-query';
import { Alert, Flex, Grid, Table, type TableProps } from 'antd';
import { useTranslation } from 'react-i18next';
import type { PaginatedResponse } from '@/core/http/api-envelope';
import { getApiErrorMessage } from '@/core/http/api-error';
import {
  type FilterShape,
  type ListParams,
  PAGE_SIZE_OPTIONS,
} from './use-list-params';

interface PaginatedTableProps<T, S extends FilterShape> extends Omit<
  TableProps<T>,
  'dataSource' | 'loading' | 'pagination'
> {
  query: UseQueryResult<PaginatedResponse<T>>;
  listParams: ListParams<S>;
}

export const PaginatedTable = <T extends object, S extends FilterShape>({
  query,
  listParams,
  ...tableProps
}: PaginatedTableProps<T, S>) => {
  const { t } = useTranslation();
  const { xs } = Grid.useBreakpoint();

  return (
    <Flex vertical gap="middle">
      {query.isError && (
        <Alert type="error" showIcon title={getApiErrorMessage(query.error)} />
      )}
      <Table<T>
        scroll={{ x: 'max-content' }}
        {...tableProps}
        dataSource={query.data?.data}
        loading={query.isFetching}
        pagination={{
          current: listParams.page,
          pageSize: listParams.limit,
          total: query.data?.meta.total ?? 0,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showSizeChanger: true,
          simple: xs,
          size: xs ? 'small' : undefined,
          showTotal: (total) => t('list.total', { count: total }),
          onChange: listParams.setPagination,
        }}
      />
    </Flex>
  );
};
