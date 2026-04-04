import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: path.resolve(__dirname, '../../tests/setup-test.ts'),
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/features/**/__tests__/*.{test,spec}.{ts,tsx}'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@pkm/backend': path.resolve(__dirname, '../backend'),
    }
  }
})
