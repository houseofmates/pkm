import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    threads: false,
    setupFiles: './tests/setup-test.ts',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      'src/features/**/__tests__/*.{test,spec}.{ts,tsx}',
      'src/schema/__tests__/*.{test,spec}.{ts,tsx}',
      'apps/web/src/lib/**/__tests__/*.{test,spec}.{ts,tsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts',
        '**/vite.config.*',
        '**/webpack.config.*',
        '**/playwright.config.*',
        '**/__mocks__/**',
        '**/*.spec.{ts,tsx}',
        '**/*.test.{ts,tsx}'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './packages/core/src') },
      { find: '@core', replacement: path.resolve(__dirname, './src') }
    ]
  }
});
