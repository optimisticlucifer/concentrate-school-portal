# Concentrate — School Portal

A calm, Canvas-style school portal with three roles — **Admin**, **Teacher**, **Student** —
covering class management, assignment submission, grading, a school-statistics API, and an
optional app-aware chatbot.

Built for the Concentrate.ai full-stack assessment, using only the dependencies in the
provided `package.json` (plus Radix/shadcn UI components, as the brief allows).

## Stack

Next.js 15 · React 19 · TailwindCSS · Radix — Fastify · TypeScript · Zod — PostgreSQL 17 + Kysely — Redis — Vitest · Supertest · Playwright — Docker · GitHub Actions.

## Architecture (short version)

npm-workspaces monorepo: `apps/web` (Next) + `apps/api` (Fastify) + `packages/shared` (Zod contract).
The API layers as `route (Zod + authz) → service (rules) → repository (Kysely)`.
Redis backs the stats cache (invalidated on grade writes) and server-side sessions
(so admin *suspend* revokes access immediately). `late` / `missing` are derived, never stored.

Full design + decisions: [`docs/HLD.md`](docs/HLD.md), [`docs/adr/ADR.md`](docs/adr/ADR.md), [`docs/DESIGN.md`](docs/DESIGN.md).

## Quickstart

```bash
npm install
docker compose up -d postgres redis
cp .env.example .env
npm run db:seed
npm run dev:api    # :4000
npm run dev:web    # :3000
```

Or the whole stack in containers:

```bash
docker compose up -d --build
docker compose exec api node apps/api/dist/db/seed.js
```

Demo accounts (password `password123`): `admin@` · `teacher@` · `student1@concentrate.test`.

## Auth

Hand-rolled JWT (access + refresh) in HTTP-only cookies. Passwords hashed with the Node
`crypto` scrypt KDF (the brief forbids extra deps, so no bcrypt). Google OAuth is the
required third-party integration. Every route is protected; roles are enforced per route.

## Statistics API

`GET /api/v0/stats/{average-grades, average-grades/:id, teacher-names, student-names, classes, classes/:id}`
— read-heavy, cached in Redis, protected by JWT (admin/teacher).

## Testing

```bash
npm run coverage    # Vitest unit + Supertest integration (real Postgres + Redis)
npm run test:e2e    # Playwright end-to-end flows
```

Tests run against a real `concentrate_test` database (created automatically) and Redis DB 1
— no mocked persistence. See [`docs/TESTING.md`](docs/TESTING.md) for the coverage story.

## Deployment

Single root `Dockerfile` (targets `api` + `web`) + `docker-compose.yml`. Deploy to Coolify
or any VM with Nginx + Certbot — see [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Notes on the dependency rule

Runtime uses only the provided dependencies. Three compile/test-only additions are
documented and justified in [`docs/TESTING.md`](docs/TESTING.md): `@types/pg` and a local
`jsonwebtoken` type shim (types for already-allowed runtime deps), and `jsdom` (the DOM
environment required by the brief's own `@testing-library/react`).
