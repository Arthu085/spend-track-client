import type { SortOrder } from 'antd/es/table/interface';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

const sortOrderSchema = z.enum(['ASC', 'DESC']);

export interface ListSortParams<F extends string = string> {
  sortBy?: F;
  sortOrder?: z.infer<typeof sortOrderSchema>;
}

export const useListSorting = <F extends string>(schema: z.ZodType<F>) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sortBy = schema.safeParse(searchParams.get('sortBy'));
  const sortOrder = sortOrderSchema.safeParse(
    searchParams.get('sortOrder') ?? 'ASC',
  );
  const sorting: ListSortParams<F> =
    searchParams.getAll('sortBy').length === 1 &&
    searchParams.getAll('sortOrder').length <= 1 &&
    sortBy.success &&
    sortOrder.success
      ? { sortBy: sortBy.data, sortOrder: sortOrder.data }
      : {};

  const setSorting = (field: unknown, order: SortOrder | undefined) => {
    const parsedField = schema.safeParse(field);

    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (parsedField.success && order) {
        next.set('sortBy', parsedField.data);
        next.set('sortOrder', order === 'ascend' ? 'ASC' : 'DESC');
      } else {
        next.delete('sortBy');
        next.delete('sortOrder');
      }
      next.delete('page');

      return next;
    });
  };

  const columnSorting = (field: F) => ({
    key: field,
    sorter: true,
    sortOrder:
      sorting.sortBy === field
        ? sorting.sortOrder === 'ASC'
          ? ('ascend' as const)
          : ('descend' as const)
        : null,
  });

  return { sorting, setSorting, columnSorting };
};

export type ListSorting<F extends string = string> = ReturnType<
  typeof useListSorting<F>
>;
