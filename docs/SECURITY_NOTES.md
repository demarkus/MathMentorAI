# Security Notes — Math Mentor AI

This documents the security model as it exists in the code today. It reflects the security-hardening sprint (secure roles, protected answer keys, trusted submission); no critical issues outstanding.

## Auth model

- **Provider:** Supabase email/password, cookie-based SSR via `@supabase/ssr`.
- **Clients** (`src/lib/supabase/`):
  - `server.ts` → `createClient()` — cookie/RLS-scoped server client (anon key).
  - `client.ts` → browser client (anon key).
  - `server.ts` → `createServiceRoleClient()` — **server-only**, service-role key, bypasses RLS.
  - `proxy.ts` → middleware client used by `src/proxy.ts` to refresh sessions and guard routes.
- **Server-verified identity:** `getCurrentUser()` reads claims with `getClaims()` (not raw cookie trust) and loads the RLS-scoped profile.
- **Sign-up:** captures full name + role; learner → `student`. The profile row is provisioned with the **service-role client** because RLS blocks authenticated inserts on `profiles`. This runs only in the server action.

## Role protection

- **Two layers:**
  1. `src/proxy.ts` middleware redirects unauthenticated requests away from protected prefixes (`/dashboard`, `/onboarding`, `/learner`, `/parent`, `/teacher`, `/admin`).
  2. Every protected page **and** server action calls `requireRole(section)` (`src/lib/auth/require-role.ts`), which: no session → `/auth/sign-in`; no role → `/onboarding`; wrong role → `/dashboard`.
- The `/dashboard` route re-routes each role to its module.
- Coverage verified: all learner/parent/teacher/admin pages and their actions call `requireRole` with the correct role.
- **Role is tamper-proof:** authenticated users cannot change `profiles.role` via the Data API (column-scoped UPDATE grant permits only `full_name`). Onboarding uses the `complete_onboarding()` security-definer function, which allows only `student`/`parent`/`teacher` and sets the role only when unset. Admin is provisioned out-of-band.

## RLS model

RLS is enabled on all tables; policies are owner-scoped. See [DATABASE.md](DATABASE.md#rls-overview) for the full matrix. Key rules:

- `profiles` — read own row; **update only `full_name`** (role/email are not client-writable).
- `learner_profiles` — read/update only the user's own rows; **insert requires the profile role to be `student`** (not just ownership). Onboarding creates the row via the `complete_onboarding()` definer function.
- `quiz_sessions`, `attempts`, `reports` — a user can **read** only their own rows; **client INSERT is revoked**. Writes go through `finalize_quiz_submission()` (service_role only, atomic + idempotent).
- `topics` are public; **active** `questions` are public for **render columns only** — `answer_text`, `hint`, `solution_steps` are withheld from anon/authenticated.
- `teacher_resources` — owner (`teacher_id`) only; **insert/update additionally require the profile role to be `teacher`**; admins may select all.
- `beta_leads` — public **insert** only; select is admin-only.

## Data-exposure posture

- **Parent reports do not expose learner data.** `/parent/reports` renders placeholders and queries no learner data; `/parent/reports/[learnerId]` intentionally ignores the `learnerId` param and performs no query. This is by design until secure linking exists.
- **Teacher resources are owner-scoped.** List/detail queries filter by `teacher_id`; the detail route 404s on non-owned ids; RLS is the backstop.
- **Beta leads are not publicly readable.** The public can submit but cannot list or read submissions.
- **Answer keys are not exposed.** `answer_text`, `hint`, `solution_steps` are withheld from the Data API (column-scoped SELECT grant); grading, worksheet memos, and the practice reveal read them server-side via the service role, and the reveal is bound to the learner's issued session.
- **Assessment results cannot be forged.** Quiz submission runs through a trusted, issued-session-bound path: answers are accepted only for the session's persisted question set, scored server-side, and written atomically via `finalize_quiz_submission()`; retries are idempotent.
- **Sessions are issued only by an explicit action, and expire.** The diagnostic/practice pages create no database rows during a GET render — issuance happens in a Server Action (`startDiagnostic`/`startPractice`) triggered by an explicit click, so a prefetch or refresh never creates a session. Issued sessions carry `expires_at` (default +2h); the run view and submit/check reject sessions that are missing, wrong-owner, wrong-type, already-submitted, or expired. Abandoned issued rows are reclaimed by `cleanup_expired_sessions()` (service_role, run on a schedule); submitted history is never touched.
- **Result pages read only persisted, owned reports.** The diagnostic/practice result pages load the summary solely from the `reports` table (RLS-scoped to the owner) — there is **no unsigned `?data=` fallback**. The query pins `report_type` to the route (a practice/progress id can't render as a diagnostic and vice-versa), and a practice report whose `topicSlug` differs from the route redirects to its canonical URL. Forged, foreign, wrong-type, and missing ids all fall through to the empty state.
- **Service-role key is never client-exposed.** It is read only in `src/lib/supabase/server.ts`, used only in server code, and must never be placed in a `NEXT_PUBLIC_*` variable.
- **No `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.** The project standardises on the anon key.
- **Reflected input is escaped.** Error messages surfaced from query params render as escaped React text (no `dangerouslySetInnerHTML` anywhere).
- **No open redirect after auth.** The `next` value on `/auth/callback` is attacker-controlled, so it is normalised by `safeNextPath()` (`src/lib/auth/safe-redirect.ts`) to a same-origin, absolute application path before redirecting; anything else (absolute/protocol-relative/backslash/user-info/control-char/malformed) falls back to `/dashboard`.

## Known limitations / residual risks

- **Trusted server code uses the service-role client** (quiz-session start, grading, worksheet memos, profile provisioning, the finalize function). It bypasses RLS, so its safety depends on the surrounding `requireRole(...)` checks and server-derived ownership; `finalize_quiz_submission()` additionally re-checks session ownership and is `service_role`-only.
- **Quiz submission is idempotent** — the trusted finalize returns the existing report on retry (session single-submit + a unique `submission_key`), so back-button/retry does not duplicate rows.
- **Parent linking is unbuilt** — do **not** add learner queries to the parent routes until a secure, learner-confirmed linking mechanism exists.
- **Automated security coverage** — auth/role, answer-key, and submission invariants are covered by unit + gated integration tests (`pnpm test` / `pnpm test:integration`); see [TESTING_E2E_PLAN.md](TESTING_E2E_PLAN.md).

## Do / don't for contributors

- **Do** call `requireRole(...)` at the top of every new protected page/action.
- **Do** keep learner/teacher queries scoped by the session-derived id.
- **Don't** query learner data from parent routes.
- **Don't** import `@/lib/supabase/server` (or the service-role client) into any `"use client"` component.
- **Don't** introduce a `NEXT_PUBLIC_*` service-role or publishable key.
