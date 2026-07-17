import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Integration-test configuration.
 *
 * These tests boot a real Postgres container via Testcontainers and exercise
 * the live better-auth server against it. They are expensive (~30s startup)
 * and are therefore isolated from the fast unit suite.
 *
 * Run with `npm run test:integration`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['tests/unit/**', 'node_modules/**'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Run serially — the shared container is expensive to create per suite.
    fileParallelism: false,
    sequence: { concurrent: false },
    globalSetup: './tests/integration/globalSetup.ts',
  },
});
