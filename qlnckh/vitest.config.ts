import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    // Use jsdom for frontend tests, node for backend
    environment: 'jsdom',
    environmentMatchGlobs: {
      'apps/**/*.spec.ts': 'node',
    },
    include: ['apps/**/*.spec.ts', 'web-apps/**/*.spec.ts', 'web-apps/**/*.spec.tsx'],
    exclude: [
      'node_modules',
      'dist',
      '.nx',
      '**/node_modules',
      // E2E tests (use Playwright)
      '**/*.e2e.spec.ts',
      '**/e2e/**/*.spec.ts',
      // Integration tests that use supertest
      '**/attachments.controller.spec.ts',
    ],
    root: '.',
    setupFiles: ['./apps/src/test-setup.ts'],
    // Enable isolated environment for each test
    isolate: true,
    // Ensure reflect-metadata is loaded (Vitest 4.x - moved to top level)
    singleThread: true,
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
      // Backend alias
      '@': path.resolve(__dirname, './apps/src'),
      '@test': path.resolve(__dirname, './apps/src/test'),
      // Frontend alias (for web-apps) - use exact path strings
      '@@/lib': path.resolve(__dirname, './web-apps/src/lib'),
      '@@/components': path.resolve(__dirname, './web-apps/src/components'),
    },
  },
});
