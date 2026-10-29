import {
  DashboardOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import type { ParseKeys } from 'i18next';
import type { ComponentType } from 'react';
import type { Ability } from '@/modules/authorization/domain/ability.schema';
import { AppRoutes } from './app-routes';

interface PageMetadata {
  path: string;
  labelKey: ParseKeys;
  icon: ComponentType;
  ability?: Ability;
}

export const dashboardPage = {
  path: AppRoutes.DASHBOARD,
  labelKey: 'navigation.dashboard',
  icon: DashboardOutlined,
} satisfies PageMetadata;

export const accountsPage = {
  path: AppRoutes.ACCOUNTS,
  labelKey: 'navigation.accounts',
  icon: WalletOutlined,
} satisfies PageMetadata;

export const financialSettingsPage = {
  path: AppRoutes.FINANCIAL_SETTINGS,
  labelKey: 'navigation.financialSettings',
  icon: SettingOutlined,
} satisfies PageMetadata;

export const usersPage = {
  path: AppRoutes.USERS,
  labelKey: 'navigation.users',
  icon: TeamOutlined,
  ability: { action: 'READ', subject: 'USER' },
} satisfies PageMetadata;

export const rolesPage = {
  path: AppRoutes.ROLES,
  labelKey: 'navigation.roles',
  icon: SafetyCertificateOutlined,
  ability: { action: 'READ', subject: 'ROLE' },
} satisfies PageMetadata;
