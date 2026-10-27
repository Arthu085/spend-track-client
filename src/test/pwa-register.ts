import type { useRegisterSW as UseRegisterSW } from 'virtual:pwa-register/react';

export const useRegisterSW: typeof UseRegisterSW = () => ({
  needRefresh: [false, () => undefined],
  offlineReady: [false, () => undefined],
  updateServiceWorker: () => Promise.resolve(),
});
