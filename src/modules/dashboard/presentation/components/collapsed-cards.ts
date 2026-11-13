import { createContext, useState } from 'react';
import type { DashboardCard } from '@/modules/preferences/domain/preferences.schema';

export interface CollapsedCards {
  isCollapsed: (card: DashboardCard) => boolean;
  toggle: (card: DashboardCard) => void;
}

export const CollapsedCardsContext = createContext<CollapsedCards | null>(null);

export const useCollapsedCards = (
  collapsedByDefault: readonly DashboardCard[],
): CollapsedCards => {
  const [overrides, setOverrides] = useState<
    Partial<Record<DashboardCard, boolean>>
  >({});

  const collapsedIn = (
    current: Partial<Record<DashboardCard, boolean>>,
    card: DashboardCard,
  ) => current[card] ?? collapsedByDefault.includes(card);

  return {
    isCollapsed: (card) => collapsedIn(overrides, card),
    toggle: (card) =>
      setOverrides((current) => ({
        ...current,
        [card]: !collapsedIn(current, card),
      })),
  };
};
