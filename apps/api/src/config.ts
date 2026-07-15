export const config = {
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/concentrate-quiz',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  apiPort: Number(process.env.API_PORT ?? 4000),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
  },
} as const;

export const isGoogleConfigured = (): boolean =>
  config.google.clientId !== '' && config.google.clientSecret !== '';
