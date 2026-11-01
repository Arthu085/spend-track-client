import { AuditOutlined, UserOutlined } from '@ant-design/icons';
import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';
import { AppRoutes } from '@/core/router/app-routes';
import {
  accountsPage,
  dashboardPage,
  financialSettingsPage,
  rolesPage,
  transactionsPage,
  usersPage,
} from '@/core/router/page-metadata';
import {
  type Ability,
  hasAbility,
} from '@/modules/authorization/domain/ability.schema';

export interface HomeShortcut {
  path: string;
  labelKey: ParseKeys;
  descriptionKey: ParseKeys;
  icon: ComponentType;
  ability?: Ability;
  adminOnly?: boolean;
}

export const homeShortcuts: HomeShortcut[] = [
  {
    ...dashboardPage,
    descriptionKey: 'home.shortcuts.dashboard',
  },
  {
    ...transactionsPage,
    descriptionKey: 'home.shortcuts.transactions',
  },
  {
    ...accountsPage,
    descriptionKey: 'home.shortcuts.accounts',
  },
  {
    ...financialSettingsPage,
    descriptionKey: 'home.shortcuts.financialSettings',
  },
  {
    ...usersPage,
    descriptionKey: 'home.shortcuts.users',
  },
  {
    ...rolesPage,
    descriptionKey: 'home.shortcuts.roles',
  },
  {
    path: AppRoutes.ACCOUNT,
    labelKey: 'account.title',
    descriptionKey: 'home.shortcuts.account',
    icon: UserOutlined,
  },
  {
    path: AppRoutes.CHANGE_REQUESTS,
    labelKey: 'changeRequests.title',
    descriptionKey: 'home.shortcuts.changeRequests',
    icon: AuditOutlined,
    adminOnly: true,
  },
];

export const visibleHomeShortcuts = (
  shortcuts: readonly HomeShortcut[],
  { abilities, isAdmin }: { abilities: readonly Ability[]; isAdmin: boolean },
): HomeShortcut[] =>
  shortcuts.filter(
    ({ ability, adminOnly }) =>
      (ability === undefined || hasAbility(abilities, ability)) &&
      (!adminOnly || isAdmin),
  );
