import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { configDefaults, defineConfig } from 'vitest/config';

const SHELL_BACKGROUND = '#ffffff';

export default defineConfig(({ mode }) => {
  const { VITE_APP_NAME, VITE_APP_MARK } = loadEnv(
    mode,
    process.cwd(),
    'VITE_',
  );

  return {
    plugins: [
      react(),
      mode !== 'test' &&
        VitePWA({
          registerType: 'prompt',
          devOptions: { enabled: true, suppressWarnings: true },
          pwaAssets: { injectThemeColor: false },
          manifest: {
            name: VITE_APP_NAME,
            short_name: VITE_APP_MARK,
            lang: 'pt-BR',
            display: 'standalone',
            start_url: '/',
            theme_color: SHELL_BACKGROUND,
            background_color: SHELL_BACKGROUND,
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [/^\/api(\/|$)/],
          },
        }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      exclude: [...configDefaults.exclude, 'src/test/integration/**'],
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      alias: {
        'virtual:pwa-register/react': new URL(
          './src/test/pwa-register.ts',
          import.meta.url,
        ).pathname,
      },
      env: {
        VITE_API_URL: 'http://localhost:3000',
        VITE_APP_NAME: 'Spend Track',
        VITE_APP_MARK: 'ST',
      },
      restoreMocks: true,
    },
  };
});
