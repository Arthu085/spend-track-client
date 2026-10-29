import {
  DashboardOutlined,
  SettingOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ComponentType } from 'react';
import { AppRoutes } from '@/core/router/app-routes';
import { rolesPage, usersPage } from '@/core/router/page-metadata';
import type ptBR from '@/core/i18n/locales/pt-BR.json';
import {
  type Ability,
  hasAbility,
} from '@/modules/authorization/domain/ability.schema';

export interface NavigationItem {
  path: string;
  labelKey: `navigation.${keyof typeof ptBR.navigation}`;
  icon: ComponentType;
  ability?: Ability;
}

export interface NavigationSection {
  labelKey: `navigationSections.${keyof typeof ptBR.navigationSections}`;
  items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
  {
    labelKey: 'navigationSections.finances',
    items: [
      {
        path: AppRoutes.HOME,
        labelKey: 'navigation.dashboard',
        icon: DashboardOutlined,
      },
      {
        path: AppRoutes.ACCOUNTS,
        labelKey: 'navigation.accounts',
        icon: WalletOutlined,
      },
      {
        path: AppRoutes.FINANCIAL_SETTINGS,
        labelKey: 'navigation.financialSettings',
        icon: SettingOutlined,
      },
    ],
  },
  {
    labelKey: 'navigationSections.administration',
    items: [{ ...usersPage }, { ...rolesPage }],
  },
];

export const visibleNavigationItems = (
  items: readonly NavigationItem[],
  abilities: readonly Ability[],
): NavigationItem[] =>
  items.filter(
    ({ ability }) => ability === undefined || hasAbility(abilities, ability),
  );

export const visibleNavigationSections = (
  sections: readonly NavigationSection[],
  abilities: readonly Ability[],
): NavigationSection[] =>
  sections
    .map((section) => ({
      ...section,
      items: visibleNavigationItems(section.items, abilities),
    }))
    .filter(({ items }) => items.length > 0);
