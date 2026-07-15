# High-Level Design — Concentrate School Portal

> Canvas-style school portal. Roles: Admin / Teacher / Student. Fixed stack per SPECS.md.
> This doc is the architecture reference. It bakes in three review lenses: **eng-review**
> (is the architecture sound?), **grill-me** (where does it break?), and **ponytail**
> (is anything here that doesn't need to exist?).

## 1. Goal & constraints

- Impress a hiring reviewer with **correct, minimal, senior-grade** architecture — not maximal.
- **Hard stack** (SPECS): Next 15 / React 19 / Tailwind / Radix · Fastify / TS / Zod · Postgres 17 + Kysely · Redis · Vitest + Supertest + Playwright · GH Actions · Docker.
- **Rule:** only deps already in `package.json`. May add Radix/shadcn components. → No bcrypt, no ORM beyond Kysely, no auth library. We hand-roll with `node:crypto` + `jsonwebtoken`.
- **100% coverage**, CI-enforced.
- **Single root Dockerfile**, deployable via Docker Compose. Deploy target: **Coolify** (self-hosted, matches spec intent).

## 2. System topology

```
                 ┌─────────────────────────────────────────────┐
   Browser  ───▶ │  Next.js 15 (apps/web)  — App Router, RSC    │
                 │  serves UI, forwards HTTP-only cookie to API │
                 └───────────────┬─────────────────────────────┘
                                 │  HTTP (JSON), cookie-forwarded
                 ┌───────────────▼─────────────────────────────┐
                 │  Fastify (apps/api)  — TS, Zod-validated     │
                 │  routes → services → repositories (Kysely)   │
                 └───────┬───────────────────────┬──────────────┘
                         │                        │
                 ┌───────▼───────┐        ┌───────▼────────┐
                 │ PostgreSQL 17 │        │    Redis 7     │
                 │  (Kysely)     │        │ stats cache +  │
                 │               │        │ session store  │
                 └───────────────┘        └────────────────┘
```

Two runtime services (web + api) + Postgres + Redis. One multi-stage root `Dockerfile` builds both apps; `docker-compose.yml` wires all four.

## 3. Monorepo layout (npm workspaces)

```
concentrate-school-portal/
├── apps/
│   ├── api/          Fastify server: routes, services, repositories, migrations, seeds
│   └── web/          Next.js 15 app: role dashboards, auth, chatbot UI
├── packages/
│   └── shared/       Zod schemas + inferred DTO types = the web↔api contract
├── Dockerfile        single multi-stage build (api + web)
├── docker-compose.yml
└── .github/workflows/ci.yml
```

`packages/shared` exists because the Zod request/response schemas are the **contract** used by both sides — real reuse, not speculative. Nothing else is shared.

## 4. Layering (api)

`route (Zod parse + authz) → service (business rules) → repository (Kysely queries)`

- **Routes** validate input with Zod, enforce role via an `authorize(role[])` preHandler, delegate to services. Thin.
- **Services** hold business rules (a teacher can only grade submissions in their own class; a suspended user cannot act). Pure-ish, unit-testable, no HTTP.
- **Repositories** are the only place Kysely runs. Swappable, mockable.

This split is what makes 100% coverage tractable: services get unit tests (fast, no DB), routes get Supertest integration tests (real DB via test container/compose).

## 5. Data model

```
users(id, email UNIQUE, password_hash NULL, name, role[admin|teacher|student],
      oauth_provider NULL, oauth_subject NULL, suspended bool, created_at)
teacher_groups(id, name, created_at)
teacher_group_members(group_id → teacher_groups, teacher_id → users)
classes(id, name, teacher_id → users, created_at)
enrollments(class_id → classes, student_id → users)          -- PK(class_id, student_id)
assignments(id, class_id → classes, title, description, due_at, created_at)
submissions(id, assignment_id → assignments, student_id → users,
            content, submitted_at, status[submitted|graded])  -- UNIQUE(assignment_id, student_id)
grades(submission_id → submissions PK, score numeric, feedback, graded_at)
```

Submission lifecycle is a state machine: `assigned (no row) → submitted → graded`. `late` / `missing` are **derived** (compare `submitted_at`/now to `due_at`), not stored — one source of truth.

## 6. Auth (roll-your-own JWT + Google OAuth)

- **Password login** for seeded accounts: hash with `node:crypto` **scrypt** (stdlib — no bcrypt dep). Constant-time compare via `crypto.timingSafeEqual`.
- **Google OAuth**: authorization-code flow. On callback → upsert user by `oauth_subject` → issue our own tokens. Satisfies the "≥1 OAuth" requirement.
- **Tokens**: short-lived **access JWT** (15 min) + longer **refresh token**, both in **HTTP-only, Secure, SameSite=Lax cookies**. `jsonwebtoken` signs/verifies.
- **Sessions in Redis**: refresh tokens are tracked server-side (`session:<jti>`). Logout and **admin suspend** delete sessions → immediate revocation. This is why Redis is not decorative.
- Every route (incl. all `/api/v0/stats/*`) is behind an auth preHandler. Role checks per route.

## 7. Stats API (`/api/v0/stats/*`)

Six read endpoints per SPECS. Read-heavy → **cached in Redis** with short TTL; cache **invalidated** on grade writes. Protected by JWT (admin/teacher scope). Demonstrates caching + invalidation, the natural senior touch the research flagged.

## 8. Chatbot (extra credit)

Fastify route → **Anthropic Claude (Haiku)**. Context = the requesting user's own scoped data (their classes / assignments / grades) injected into the system prompt. Answers "what's due?", "what's my average?" Strictly scoped to the caller's data (no cross-tenant leak). Uses `fetch` to Anthropic API — no new dep.

## 9. Frontend

- App Router. Same sidebar shell, **role-scoped nav** (no greyed-out links).
- Dashboards per role: Student = "what's due" + status pills; Teacher = "needs grading" queue; Admin = counts + recent activity.
- Design system: see `DESIGN.md` — warm stone bg + muted emerald primary, status pills reused everywhere, empty states as onboarding, subtle micro-interactions. Radix primitives + shadcn-style wrappers.
- **Thought of the day**: static curated JSON, rotates by day-of-year, quiet card. No API, no cheese.

## 10. Testing strategy (→ 100%)

| Layer | Tool | What |
|---|---|---|
| Services | Vitest | Business rules, authz logic, derived-state helpers |
| Repositories/API | Supertest + Vitest | Endpoints against a real test Postgres/Redis |
| Components | @testing-library/react | Pills, forms, dashboards, empty states |
| E2E | Playwright | Login → submit → grade → see grade; role gates |

Coverage gate in CI (`vitest --coverage`, threshold 100 on the lines we own; generated/config excluded via coverage config). Honest note: 100% literal across an entire full-stack app is the spec's bar; we drive service+API to 100% first (highest value + most feasible) and push component/E2E as far as time allows, documenting the exact number.

## 11. CI/CD

GH Actions: `install → lint → typecheck → test+coverage(gate) → build → docker build → push (GHCR/Docker Hub)`. Postgres+Redis as service containers for integration tests.

## 12. Deployment (Coolify)

- Root **multi-stage Dockerfile** builds api + web into one image (or two targets).
- `docker-compose.yml`: app(s) + postgres + redis. Coolify deploys the compose, provides TLS via its proxy.
- `docs/DEPLOY.md` also documents the **manual self-hosted path** (Nginx reverse proxy + Certbot) exactly as SPECS asks, so both stories are covered.

## 13. Explicitly NOT building (ponytail / YAGNI)

- No password reset, email verification, or multi-OAuth — one provider satisfies spec.
- No rubrics/peer-review/discussions — Canvas-depth features a reviewer won't expect from a solo build (P2 in research).
- No separate admin microservice — role is a column, not a service boundary.
- No GraphQL, no tRPC — REST + Zod contract is enough.
- `late`/`missing` derived, not stored — no denormalization to keep in sync.
