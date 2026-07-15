import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://localhost:3000' },
  webServer: [
    {
      command: 'node apps/api/dist/index.js',
      port: 4000,
      reuseExistingServer: true,
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ??
          'postgres://postgres:postgres@localhost:5432/concentrate-quiz',
        REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
        JWT_SECRET: 'e2e-secret',
        API_PORT: '4000',
      },
    },
    {
      command: 'npm run start -w @concentrate/web',
      port: 3000,
      reuseExistingServer: true,
      env: { API_ORIGIN: 'http://localhost:4000' },
    },
  ],
});
