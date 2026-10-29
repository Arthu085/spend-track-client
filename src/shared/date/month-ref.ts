export interface MonthRef {
  year: number;
  month: number;
}

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

const isIntegerInRange = (value: number, min: number, max: number) =>
  Number.isInteger(value) && value >= min && value <= max;

export const parseMonthRef = (
  year: string | null,
  month: string | null,
): MonthRef | undefined => {
  const ref = { year: Number(year), month: Number(month) };

  return year !== null &&
    month !== null &&
    isIntegerInRange(ref.year, MIN_YEAR, MAX_YEAR) &&
    isIntegerInRange(ref.month, 1, 12)
    ? ref
    : undefined;
};

export const shiftMonth = (
  { year, month }: MonthRef,
  offset: number,
): MonthRef => {
  const index = year * 12 + (month - 1) + offset;

  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

export const formatMonthLabel = ({ year, month }: MonthRef, language: string) =>
  new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

export const monthRefOfDate = (date: string): MonthRef => {
  const [year, month] = date.split('-').map(Number);

  return { year, month };
};

const twoDigits = (value: number) => String(value).padStart(2, '0');

export const monthDateRange = ({ year, month }: MonthRef) => {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${twoDigits(month)}`;

  return { from: `${prefix}-01`, to: `${prefix}-${twoDigits(lastDay)}` };
};
