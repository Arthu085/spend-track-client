export const displaySharePercent = (part: string, total: string): number => {
  const totalValue = Number(total);

  return totalValue > 0 ? Math.round((Number(part) / totalValue) * 100) : 0;
};
