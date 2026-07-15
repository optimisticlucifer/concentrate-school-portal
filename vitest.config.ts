import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'apps/api/src/**',
        'apps/web/src/**',
        'packages/shared/src/**',
      ],
      exclude: [
        '**/*.test.*',
        '**/test/**',
        '**/*.d.ts',
        'apps/api/src/index.ts',
        'apps/api/src/db/migrate.ts',
        'apps/api/src/db/seed.ts',
        'apps/api/src/db/migrations/**',
        'apps/web/src/app/**/layout.tsx',
        'apps/web/src/middleware.ts',
      ],
    },
  },
});
