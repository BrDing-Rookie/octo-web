import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@octo/base': path.resolve(__dirname, 'src/__mocks__/dmworkBase.ts'),
    },
  },
});
