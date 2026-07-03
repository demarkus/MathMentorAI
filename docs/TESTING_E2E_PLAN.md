# Testing plan — integration & E2E

Layered strategy to cover what the offline unit suite (Vitest, `pnpm test`)
can't: **RLS enforcement** and **real user journeys** against live Postgres/Auth.

## Layers

### Layer 1 — RLS / integration (no browser) — **implemented (Phase 1), gated**
Real `@supabase/supabase-js` against a **dedicated test Supabase project**. Users
are provisioned confirmed via the service-role admin API, then RLS boundaries are
asserted with anon-key clients carrying each user's JWT.

- Files: `tests/integration/` (`helpers.ts`, `rls.test.ts`).
- Config: `vitest.integration.config.ts`; run with `pnpm test:integration`.
- **Gated:** skips unless `INTEGRATION_SUPABASE_*` env vars are set (see below),
  so the offline `pnpm test` unit run never touches the network.

Covered so far: `profiles`, `learner_profiles`, `quiz_sessions` owner-scoping;
`teacher_resources` owner-only + admin-read-all; `beta_leads` public-insert /
no-public-read / admin-read.

Phase 1b follow-ups (same pattern): `attempts` and `reports` owner-scoping;
`topics` + **active** `questions` public read while **inactive** questions stay
hidden.

### Layer 2 — E2E (Playwright) — **not started**
Drive the built app in a browser against the test project. Auth handled by
pre-provisioned confirmed users (so production email-confirmation stays on).
Journeys mirror [BETA_SMOKE_TEST.md](BETA_SMOKE_TEST.md): public marketing, auth
+ onboarding→diagnostic, learner core loop, teacher generator, admin CRUD, parent
placeholders. Adds `@playwright/test` + browser binaries and a `test:e2e` script.

### Layer 3 — CI — **not started**
A GitHub Actions workflow (none exists today) running unit tests on every push,
and the gated integration/e2e suites when the test-project secrets are configured.

## Running the integration suite

Point it at a **dedicated, non-production** Supabase project that has all
migrations + the seed applied:

```bash
export INTEGRATION_SUPABASE_URL="https://<test-project>.supabase.co"
export INTEGRATION_SUPABASE_ANON_KEY="<test anon key>"
export INTEGRATION_SUPABASE_SERVICE_ROLE_KEY="<test service-role key>"
pnpm test:integration
```

Without these, the suite **skips** (0 failures). It uses distinct env var names
(`INTEGRATION_*`) — not the app's `NEXT_PUBLIC_SUPABASE_*` — specifically so it
can never accidentally run against the app's normal/production project. Each run
creates uniquely-named users and cleans them up in `afterAll`.

## Status

| Layer | State |
|-------|-------|
| Unit (Vitest) | ✅ 63 tests |
| Integration / RLS (Phase 1) | ✅ Implemented, gated (needs a test project to execute) |
| Integration Phase 1b (attempts/reports/public-read) | ⬜ Planned |
| E2E (Playwright) | ⬜ Planned |
| CI workflow | ⬜ Planned |
