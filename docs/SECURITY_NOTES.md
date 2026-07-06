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
- `quiz_sessions`, `attempts`, `reports` — a user can **read** only their own rows (plus, read-only, a parent holding an **accepted** `parent_learner_links` row for that learner); **client INSERT is revoked**. Writes go through `finalize_quiz_submission()` (service_role only, atomic + idempotent).
- `parent_learner_links` — parents select/insert/delete **their own** links (insert is role-checked and column-scoped to `(parent_id, learner_email)`); learners select/update only links **addressed to their profile email**, may update only `(status, learner_id)`, only to a decision (`accepted`/`rejected`), and only binding `learner_id` to themselves.
- `topics` are public; **active** `questions` are public for **render columns only** — `answer_text`, `hint`, `solution_steps` are withheld from anon/authenticated.
- `teacher_resources` — owner (`teacher_id`) only; **insert/update additionally require the profile role to be `teacher`**; admins may select all.
- `beta_leads` — **no direct insert**; the public writes only through `submit_beta_lead()` (validates lengths, rate-limits per email/IP over 10 min, dedupes per email+plan). Select is admin-only; the stored `ip` is admin-only.

## Data-exposure posture

- **Parent reports expose only linked learners' data.** Parents connect a learner via `parent_learner_links`: the parent invites by email and only the addressed learner can accept. Until a link is **accepted**, a parent can read nothing. `/parent/reports` and `/parent/reports/[learnerId]` run under the parent's own RLS-scoped session (never the service role); the detail page additionally re-checks the accepted link explicitly (defense in depth) and treats a missing/unauthorized id as access denied. Parent access is SELECT-only and revocable — deleting the link cuts access immediately; all write paths are unchanged.
- **Teacher resources are owner-scoped.** List/detail queries filter by `teacher_id`; the detail route 404s on non-owned ids; RLS is the backstop.
- **Beta leads are not publicly readable, and the form is abuse-hardened at the DB boundary.** The public can submit but cannot list or read submissions. `submit_beta_lead()` is **service-role-only** — an anonymous Data API caller cannot invoke it or supply a `p_ip`; the validated Server Action calls it via the service role with a server-derived IP (direct table insert stays revoked). The function enforces server-side length caps, a **canonical plan allow-list** (mirror of `plans.ts`), **advisory-locked** per-email/IP rate limiting (5 / 10 min), and **concurrency-safe** per-email+plan duplicate suppression via a unique index (`ON CONFLICT DO NOTHING`) — concurrent duplicate/burst submissions resolve cleanly without 500s. The IP is only trustworthy behind a proxy/CDN that overwrites `x-forwarded-for`; the safe fallback is null (email-based limiting still applies).
- **Answer keys are not exposed.** `answer_text`, `hint`, `solution_steps` are withheld from the Data API (column-scoped SELECT grant); grading, worksheet memos, and the practice reveal read them server-side via the service role, and the reveal is bound to the learner's issued session.
- **Assessment results cannot be forged.** Quiz submission runs through a trusted, issued-session-bound path: answers are accepted only for the session's persisted question set, scored server-side, and written atomically via `finalize_quiz_submission()`; retries are idempotent.
- **Sessions are issued only by an explicit action, and expire.** The diagnostic/practice pages create no database rows during a GET render — issuance happens in a Server Action (`startDiagnostic`/`startPractice`) triggered by an explicit click, so a prefetch or refresh never creates a session. Issued sessions carry `expires_at` (default +2h); the run view and submit/check reject sessions that are missing, wrong-owner, wrong-type, already-submitted, or expired. Abandoned issued rows are reclaimed by `cleanup_expired_sessions()` (service_role, run on a schedule); submitted history is never touched.
- **Result pages read only persisted, owned reports.** The diagnostic/practice result pages load the summary solely from the `reports` table (RLS-scoped to the owner) — there is **no unsigned `?data=` fallback**. The query pins `report_type` to the route (a practice/progress id can't render as a diagnostic and vice-versa), and a practice report whose `topicSlug` differs from the route redirects to its canonical URL. Forged, foreign, wrong-type, and missing ids all fall through to the empty state.
- **Service-role key is never client-exposed.** It is read only in `src/lib/supabase/server.ts`, used only in server code, and must never be placed in a `NEXT_PUBLIC_*` variable.
- **Anthropic API key follows the same rule, and AI feedback is privacy-bounded.** `ANTHROPIC_API_KEY` is optional and read only in `src/lib/ai/generate-hint.ts` and `src/lib/ai/generate-solution.ts` (server-only; never `NEXT_PUBLIC_*`). When set, a wrong answer (practice check, or diagnostic grading for the persisted review) sends **only** the question text, the stored answer, and the learner's typed answer to the Anthropic API — never names, emails, or ids. Marking stays deterministic (`isAnswerCorrect`); the model can only supply hint text and worked steps. Hints that echo the correct answer are discarded; worked steps that fail to derive the stored answer are discarded; every failure falls back to the seeded content.
- **No `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.** The project standardises on the anon key. A future migration to Supabase publishable/secret keys is documented as an additive, non-breaking change in [DEPLOYMENT.md](DEPLOYMENT.md#supabase-api-keys-current-contract--future-migration); the secret key must stay server-only like the service-role key.
- **Authenticated areas are not cached.** The proxy sets `Cache-Control: private, no-store, max-age=0, must-revalidate` on responses for the protected prefixes (`/dashboard`, `/onboarding`, `/learner`, `/parent`, `/teacher`, `/admin`), so per-user content is never stored by the browser or a shared cache/CDN.
- **Reflected input is escaped.** Error messages surfaced from query params render as escaped React text (no `dangerouslySetInnerHTML` anywhere).
- **No open redirect after auth.** The `next` value on `/auth/callback` is attacker-controlled, so it is normalised by `safeNextPath()` (`src/lib/auth/safe-redirect.ts`) to a same-origin, absolute application path before redirecting; anything else (absolute/protocol-relative/backslash/user-info/control-char/malformed) falls back to `/dashboard`.

## Known limitations / residual risks

- **Trusted server code uses the service-role client** (quiz-session start, grading, worksheet memos, profile provisioning, the finalize function). It bypasses RLS, so its safety depends on the surrounding `requireRole(...)` checks and server-derived ownership; `finalize_quiz_submission()` additionally re-checks session ownership and is `service_role`-only.
- **Quiz submission is idempotent** — the trusted finalize returns the existing report on retry (session single-submit + a unique `submission_key`), so back-button/retry does not duplicate rows.
- **Parent linking is email-addressed** — an invitation targets the learner's **profile email**, so whoever controls that account can accept it. There is no secondary verification (e.g. a code the parent reads out), so a mistyped email invites the wrong account; the parent's links list shows the exact address, and removing the link revokes access instantly.
- **Automated security coverage** — auth/role, answer-key, and submission invariants are covered by unit + gated integration tests (`pnpm test` / `pnpm test:integration`); see [TESTING_E2E_PLAN.md](TESTING_E2E_PLAN.md).

## Do / don't for contributors

- **Do** call `requireRole(...)` at the top of every new protected page/action.
- **Do** keep learner/teacher queries scoped by the session-derived id.
- **Don't** query learner data from parent routes with the service-role client — parent reads must stay on the RLS-scoped session client so accepted-link gating applies.
- **Don't** import `@/lib/supabase/server` (or the service-role client) into any `"use client"` component.
- **Don't** introduce a `NEXT_PUBLIC_*` service-role or publishable key.
