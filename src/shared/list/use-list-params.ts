import { useSearchParams } from 'react-router';
import { z } from 'zod';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

const PAGE_PARAM = 'page';
const LIMIT_PARAM = 'limit';

const pageSchema = z.coerce.number().int().min(1);
const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(Math.max(...PAGE_SIZE_OPTIONS));

export type FilterShape = Record<string, z.ZodType<string>>;

export type ListFilters<S extends FilterShape> = {
  [K in keyof S]?: z.output<S[K]>;
};

export interface ListParams<S extends FilterShape> {
  page: number;
  limit: number;
  filters: ListFilters<S>;
  setPagination: (page: number, limit: number) => void;
  setFilters: (filters: ListFilters<S>) => void;
}

const readNumber = (schema: z.ZodType<number>, value: string | null) => {
  const result = schema.safeParse(value ?? undefined);

  return result.success ? result.data : undefined;
};

const readFilters = <S extends FilterShape>(
  shape: S,
  params: URLSearchParams,
): ListFilters<S> => {
  const filters: ListFilters<S> = {};

  for (const key of Object.keys(shape) as (keyof S & string)[]) {
    const value = params.get(key);
    const result = value ? shape[key].safeParse(value) : undefined;

    if (result?.success) {
      filters[key] = result.data;
    }
  }

  return filters;
};

const setParam = (
  params: URLSearchParams,
  key: string,
  value: string | undefined,
) => {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
};

export const useListParams = <S extends FilterShape>(
  filterShape: S,
  defaultFilters: ListFilters<S> = {},
): ListParams<S> => {
  const [searchParams, setSearchParams] = useSearchParams();

  const setPagination = (page: number, limit: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      setParam(next, PAGE_PARAM, page === DEFAULT_PAGE ? '' : String(page));
      setParam(
        next,
        LIMIT_PARAM,
        limit === DEFAULT_PAGE_SIZE ? '' : String(limit),
      );

      return next;
    });
  };

  const setFilters = (filters: ListFilters<S>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      for (const key of Object.keys(filterShape)) {
        const value = filters[key]?.trim();

        setParam(next, key, value === defaultFilters[key] ? '' : value);
      }
      next.delete(PAGE_PARAM);

      return next;
    });
  };

  return {
    page: readNumber(pageSchema, searchParams.get(PAGE_PARAM)) ?? DEFAULT_PAGE,
    limit:
      readNumber(limitSchema, searchParams.get(LIMIT_PARAM)) ??
      DEFAULT_PAGE_SIZE,
    filters: { ...defaultFilters, ...readFilters(filterShape, searchParams) },
    setPagination,
    setFilters,
  };
};
