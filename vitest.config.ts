import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@hr/db': path.resolve(__dirname, 'packages/db/src/index.ts'),
      '@hr/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
      '@hr/config': path.resolve(__dirname, 'packages/config/src/index.ts'),
      '@hr/schemas': path.resolve(__dirname, 'packages/schemas/src/index.ts'),
      '@hr/fixtures': path.resolve(__dirname, 'packages/fixtures/src/index.ts'),
      '@hr/card-kit/typography': path.resolve(__dirname, 'packages/card-kit/src/typography.ts'),
      '@hr/card-kit/renderer': path.resolve(__dirname, 'packages/card-kit/src/renderer.ts'),
      '@hr/card-kit': path.resolve(__dirname, 'packages/card-kit/src/index.ts'),
      '@hr/i18n': path.resolve(__dirname, 'packages/i18n/src/index.ts'),
      '@hr/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', 'apps/**/*', 'packages/**/*'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
