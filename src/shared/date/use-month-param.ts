import { useSearchParams } from 'react-router';
import { PAGE_PARAM } from '@/shared/list/use-list-params';
import { type MonthRef, parseMonthRef } from './month-ref';

const YEAR_PARAM = 'year';
const MONTH_PARAM = 'month';

export const useMonthParam = (): [
  MonthRef | undefined,
  (month: MonthRef) => void,
] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const setMonth = ({ year, month }: MonthRef) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      next.set(YEAR_PARAM, String(year));
      next.set(MONTH_PARAM, String(month));
      next.delete(PAGE_PARAM);

      return next;
    });
  };

  return [
    parseMonthRef(searchParams.get(YEAR_PARAM), searchParams.get(MONTH_PARAM)),
    setMonth,
  ];
};
