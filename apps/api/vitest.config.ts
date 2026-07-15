import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'api',
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    fileParallelism: false,
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 30000,
    testTimeout: 20000,
  },
});
