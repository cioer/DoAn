import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/**/*.spec.ts', 'web-apps/**/*.spec.tsx'],
    exclude: ['node_modules', 'dist', '.nx', '**/node_modules'],
    root: '.',
    setupFiles: ['./apps/src/test-setup.ts'],
    // Ensure reflect-metadata is loaded
    poolOptions: {
      threads: {
        singleThread: true,
      },
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.nx/',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.d.ts',
        '**/test-setup.ts',
      ],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/src'),
      '@test': path.resolve(__dirname, './apps/src/test'),
    },
  },
});
