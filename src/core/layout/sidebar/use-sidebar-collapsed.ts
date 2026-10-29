import { useState } from 'react';

export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';

const readStoredSidebarCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const storeSidebarCollapsed = (collapsed: boolean): boolean => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
    return true;
  } catch {
    return false;
  }
};

export const useSidebarCollapsed = () => {
  const [collapsed, setCollapsed] = useState(readStoredSidebarCollapsed);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
    storeSidebarCollapsed(!collapsed);
  };

  return { collapsed, toggleCollapsed };
};
