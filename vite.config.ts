import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { panoramaWorkbenchPlugin } from './scripts/panorama-workbench.ts';
import {
  contractWorkbenchPlugin,
  productionIsolationPlugin,
} from './scripts/contract-workbench.ts';

export default defineConfig({
  cacheDir: process.env.VITEST
    ? 'node_modules/.vite-verification'
    : 'node_modules/.vite-app',
  plugins: [
    react(),
    contractWorkbenchPlugin(),
    panoramaWorkbenchPlugin(),
    productionIsolationPlugin(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
