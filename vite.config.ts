import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { historyReleasePlugin } from './scripts/history-release';
import {
  contractWorkbenchPlugin,
  productionIsolationPlugin,
} from './scripts/contract-workbench.ts';

export default defineConfig({
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
