# Architecture Decision Records

Each record: decision, why, alternatives rejected, and the grilling it survived.

---

## ADR-001 — Fastify API + Next.js web as two services (not Next API routes only)

**Decision:** Separate Fastify backend (`apps/api`) and Next.js frontend (`apps/web`).
**Why:** SPECS mandates Fastify. It also gives a clean, framework-agnostic API surface (the `/api/v0/stats/*` "external integration" endpoints read better as a real API than as Next route handlers).
**Rejected:** Next.js route handlers only — would ignore the required Fastify dep and muddy the "exposed API" story.
**Grill:** *Two services = more ops.* Accepted — one root Dockerfile + compose keeps ops single-command; the separation is the point of the assessment.

---

## ADR-002 — Hand-rolled auth with `node:crypto` scrypt + `jsonwebtoken`

**Decision:** Password hashing via stdlib `crypto.scrypt`; JWTs via `jsonwebtoken`; tokens in HTTP-only cookies.
**Why:** SPECS says "roll your own JWT." `package.json` has `jsonwebtoken` but **no bcrypt/argon2** and the rule forbids new deps. `scrypt` is a memory-hard KDF in the stdlib — correct and dependency-free.
**Rejected:** bcrypt (new dep, banned), plain SHA (insecure), NextAuth/Lucia (new deps, and spec wants roll-your-own).
**Grill:** *scrypt params?* Use `N=16384,r=8,p=1`, 16-byte salt, `timingSafeEqual` compare. *Cookie theft?* Secure + SameSite=Lax + short access TTL + server-side session revocation (ADR-004).

---

## ADR-003 — Kysely as the only DB layer; migrations via Kysely Migrator

**Decision:** All SQL through Kysely in a repository layer. Schema managed by Kysely's built-in `Migrator`.
**Why:** SPECS mandates Kysely. Its Migrator ships with the lib — no new migration tool. Type-safe queries help the `no-any` lint rule.
**Rejected:** Prisma/Drizzle (new deps, banned), raw `pg` strings (loses types, injection risk).
**Grill:** *Seed data for a good demo?* Seed script inserts ~3 classes, ~25–30 students, mixed submission states — the research warns n=3 hides grading-UI friction.

---

## ADR-004 — Redis for stats cache + session store (justified, not decorative)

**Decision:** Redis holds (a) cached `/stats/*` responses with TTL + write-invalidation, (b) refresh-token sessions keyed by `jti`.
**Why:** SPECS includes Redis; it must earn its place. Stats are read-heavy (cacheable); session store enables **immediate revocation** on logout/suspend — a real security property.
**Rejected:** In-memory cache (lost on restart, no cross-instance), JWT-only sessions (can't revoke before expiry).
**Grill:** *Stale stats after a grade?* Invalidate the relevant stats keys inside the grade-write path. *Redis down?* Cache miss falls through to Postgres; sessions degrade to access-token-only (fail-safe, logged).

---

## ADR-005 — `late` / `missing` are derived, never stored

**Decision:** Compute overdue state from `due_at` vs `submitted_at`/now at read time.
**Why:** One source of truth. Stored flags drift and need a cron to flip `missing`.
**Rejected:** Materialized status column — needs a scheduler and back-fill; classic denormalization bug farm.
**Grill:** *Perf of computing per row?* Trivial comparison; the stats aggregates are the only heavy reads and those are cached.

---

## ADR-006 — Shared Zod schemas as the web↔api contract (`packages/shared`)

**Decision:** Request/response DTOs defined once as Zod schemas in `packages/shared`; both apps import them.
**Why:** Single contract; client gets types + can validate; server validates the same shapes. Genuine reuse.
**Rejected:** Duplicated types per app (drift), OpenAPI codegen (new tooling for little gain at this size).
**Grill:** *Coverage cost of a shared pkg?* Schemas are exercised by both apps' tests; a small schema unit test covers edge branches.

---

## ADR-007 — Deploy to Coolify via Docker Compose; document Nginx+Certbot path

**Decision:** Primary deploy = Coolify running the compose stack. `DEPLOY.md` also gives the manual Nginx reverse-proxy + Certbot steps SPECS asks for.
**Why:** Coolify matches the self-hosted intent, provides TLS via its proxy, and is a stronger demo than Vercel (which can't cleanly host Fastify+Postgres+Redis). Documenting the manual path proves we understand the spec's stated method.
**Rejected:** Vercel (splits the stack, needs managed DB/Redis, deviates from spec).
**Grill:** *Coolify TLS vs Certbot?* Coolify's proxy handles certs automatically; the Certbot doc is the "no-Coolify" fallback so the submission satisfies SPECS literally.

---

## ADR-008 — Chatbot scoped strictly to caller's own data (Anthropic Claude)

**Decision:** Chatbot injects only the authenticated user's scoped data into the prompt; calls Anthropic via `fetch`.
**Why:** Extra credit with a real security boundary — no cross-tenant leakage. No SDK dep needed.
**Rejected:** Passing raw DB access / broad context (leak risk), a new LLM SDK (banned dep).
**Grill:** *Prompt injection escalating role?* The server fetches the scoped data by the caller's own id/role before the model sees anything; the model never issues queries. Injection can't widen scope.
