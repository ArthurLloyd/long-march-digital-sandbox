import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { historyReleasePlugin } from './scripts/history-release';
import {
  contractWorkbenchPlugin,
  productionIsolationPlugin,
} from './scripts/contract-workbench.ts';

export default defineConfig({
  // Programmatic build/preview tests must not rewrite the live app's React cache.
  cacheDir: process.env.VITEST
    ? 'node_modules/.vite-verification'
    : 'node_modules/.vite-app',
  plugins: [
    historyReleasePlugin(),
    react(),
    contractWorkbenchPlugin(),
    productionIsolationPlugin(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
