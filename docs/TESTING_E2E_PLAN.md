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

Covered: `profiles`, `learner_profiles`, `quiz_sessions`, `attempts`, `reports`
owner-scoping; `topics` public read + **active**-only `questions` (inactive stay
hidden); `teacher_resources` owner-only + admin-read-all; `beta_leads`
public-insert / no-public-read / admin-read. Fixtures (a throwaway topic +
active/inactive questions) are created and torn down per run.

### Layer 2 — E2E (Playwright)

**Phase 2a — implemented & runnable (no backend needed).** `pnpm test:e2e`
(`e2e/`, config in `playwright.config.ts`) drives real Chromium against the app,
which is booted with **placeholder Supabase env** so it never touches a real
project. Covered: public marketing (landing hero + CTAs, pricing→`/beta?plan=`,
beta plan preselect + required-field validation) and routing/protection
(unauthenticated protected routes → sign-in; legacy `/login`, `/signup`,
`/practice` redirects). No writes — read-only navigation only.

**Phase 2b — auth journeys (implemented, gated).** `e2e/auth.spec.ts` (+
`e2e/support/supabase.ts`) covers: a learner signs in → learner dashboard; a
new user completes onboarding → routed into the diagnostic; wrong-role access is
redirected; sign-out clears the session. Users are pre-provisioned CONFIRMED via
the service-role admin API (so production email-confirmation stays on) and torn
down after each test. Gated on `E2E_SUPABASE_*` (the config also passes them to
the app server); skips otherwise. **Not yet executed against a live project** —
verified to collect and skip; run it by setting `E2E_SUPABASE_*`.

First run only: install the browser with `pnpm exec playwright install chromium`.

### Layer 3 — CI — **implemented**
`.github/workflows/ci.yml` runs on every push to `main`, on every pull request,
and on manual dispatch (Node 22, pnpm 10):

- **test** job: `pnpm install --frozen-lockfile` → `lint` → `build` → `test`
  (unit) → `test:integration` (skips unless the `INTEGRATION_SUPABASE_*` repo
  secrets are set).
- **e2e** job: installs Chromium (`--with-deps`) → `test:e2e` (marketing +
  routing/protection run with the placeholder backend, no secrets needed; auth
  journeys run when `E2E_SUPABASE_*` secrets are set). Playwright traces are
  uploaded as an artifact on failure.

**Optional repo secrets** (Settings → Secrets and variables → Actions) to run the
gated suites against a dedicated test project: `INTEGRATION_SUPABASE_URL`,
`INTEGRATION_SUPABASE_ANON_KEY`, `INTEGRATION_SUPABASE_SERVICE_ROLE_KEY` and the
`E2E_SUPABASE_*` equivalents. Without them, CI is still green — the gated suites
skip.

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
| Integration / RLS (Phase 1 + 1b) | ✅ Implemented, gated (needs a test project to execute) |
| E2E Phase 2a (marketing + routing/protection) | ✅ Implemented & passing (placeholder backend) |
| E2E Phase 2b (auth journeys) | ✅ Implemented, gated (needs a test project to execute) |
| CI workflow (GitHub Actions) | ✅ Implemented (lint/build/unit/e2e on every push + PR) |
