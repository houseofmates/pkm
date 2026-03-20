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
    ]
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './packages/core/src') },
      { find: '@core', replacement: path.resolve(__dirname, './src') }
    ]
  }
});
