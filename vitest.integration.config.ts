import { configDefaults, defineConfig } from 'vitest/config';
import createBaseConfig from './vite.config.ts';

export default defineConfig((configEnv) => {
  const baseConfig = createBaseConfig(configEnv);

  return {
    ...baseConfig,
    test: {
      ...baseConfig.test,
      include: ['src/test/integration/**/*.spec.ts'],
      exclude: configDefaults.exclude,
      globalSetup: ['./test/integration/global-setup.ts'],
      environmentOptions: {
        jsdom: { url: 'http://localhost:5173' },
      },
      testTimeout: 20_000,
      hookTimeout: 120_000,
      maxWorkers: 1,
    },
  };
});
