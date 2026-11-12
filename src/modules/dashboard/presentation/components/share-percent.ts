export const sharePercent = (part: string, total: string): number | null => {
  const totalValue = Number(total);

  return totalValue > 0 ? Math.round((Number(part) / totalValue) * 100) : null;
};

export const displaySharePercent = (part: string, total: string): number =>
  Math.max(0, sharePercent(part, total) ?? 0);
