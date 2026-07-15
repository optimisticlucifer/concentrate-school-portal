import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['apps/api/src/**', 'apps/web/src/lib/**', 'apps/web/src/components/**'],
      exclude: [
        '**/*.test.*',
        '**/test/**',
        '**/*.d.ts',
        '**/types.ts',
        'apps/api/src/index.ts',
        'apps/api/src/db/migrate.ts',
        'apps/api/src/db/seed.ts',
        'apps/api/src/db/migrations/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        statements: 90,
        branches: 85,
      },
    },
  },
});
