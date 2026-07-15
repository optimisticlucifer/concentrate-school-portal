# Concentrate School Portal — Build Plan

Deploy: **Coolify** · OAuth: **Google** · Chatbot: **Anthropic Claude** · Repo: **github.com/optimisticlucifer/concentrate-school-portal (public)**

## Phase 0 — Planning ✅
- [x] Read SPECS + configs, clone template
- [x] Research edtech UX + color psychology
- [x] HLD.md, ADRs, DESIGN.md

## Phase 1 — Scaffold & foundation
- [ ] npm workspaces monorepo (apps/api, apps/web, packages/shared)
- [ ] Tailwind config with design-system palette
- [ ] docker-compose (postgres + redis) up locally
- [ ] Kysely schema + migrations + seed (~25-30 students, mixed states)

## Phase 2 — Backend (Fastify)
- [ ] Auth: scrypt passwords, JWT cookies, Google OAuth, Redis sessions
- [ ] authorize(role[]) preHandler + suspend enforcement
- [ ] Admin services (teacher groups, users CRUD, suspend)
- [ ] Teacher services (classes CRUD, enroll, assignments, grading)
- [ ] Student services (view classes/assignments, submit, view grades)
- [ ] Stats API (6 endpoints) + Redis cache + invalidation
- [ ] Chatbot route (Anthropic, scoped context)

## Phase 3 — Frontend (Next.js)
- [ ] Auth pages + Google button
- [ ] Sidebar shell + role-scoped nav
- [ ] Student / Teacher / Admin dashboards
- [ ] Assignment + submission + grading flows, status pills, empty states
- [ ] Thought-of-the-day card, chatbot widget

## Phase 4 — Tests → coverage
- [ ] Vitest unit (services)
- [ ] Supertest integration (endpoints)
- [ ] testing-library component tests
- [ ] Playwright E2E (login→submit→grade)
- [ ] Coverage gate config

## Phase 5 — CI/CD & Docker
- [ ] Root multi-stage Dockerfile
- [ ] GH Actions: lint/typecheck/test+coverage/build/push
- [ ] docs/DEPLOY.md (Coolify + Nginx/Certbot manual path)

## Phase 6 — Deploy & submit
- [ ] Push public GitHub repo
- [ ] Deploy to Coolify (CONFIRM with Rohan first)
- [ ] Video script (docs/VIDEO-SCRIPT.md)

## Review
_(filled at end)_
