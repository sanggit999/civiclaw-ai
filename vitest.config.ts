import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['specs/**/tests/**/*.test.ts'],
    exclude: ['specs/TEMPLATE/**', 'node_modules/**'],
  },
});
