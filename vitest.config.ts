import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['specs/**/tests/**/*.test.ts'],
    exclude: ['specs/TEMPLATE/**', 'node_modules/**'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './admin'),
    },
  },
});

