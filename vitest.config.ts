import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Allow unit-testing modules that import `server-only`
      'server-only': path.resolve(__dirname, './src/test/server-only-stub.ts'),
    },
  },
})
