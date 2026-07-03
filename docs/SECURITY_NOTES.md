# Security Notes — Math Mentor AI

This documents the security model as it exists in the code today. It reflects the most recent QA/security audit (no critical issues outstanding).

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

## RLS model

RLS is enabled on all tables; policies are owner-scoped. See [DATABASE.md](DATABASE.md#rls-overview) for the full matrix. Key rules:

- `profiles`, `learner_profiles`, `quiz_sessions`, `attempts`, `reports` — a user can read/write only rows tied to their own `auth.uid()` (learner rows via `learner_profiles.user_id`).
- `topics` and **active** `questions` are the only public-readable content.
- `teacher_resources` — owner (`teacher_id`) only; admins may select all.
- `beta_leads` — public **insert** only; select is admin-only.

## Data-exposure posture

- **Parent reports do not expose learner data.** `/parent/reports` renders placeholders and queries no learner data; `/parent/reports/[learnerId]` intentionally ignores the `learnerId` param and performs no query. This is by design until secure linking exists.
- **Teacher resources are owner-scoped.** List/detail queries filter by `teacher_id`; the detail route 404s on non-owned ids; RLS is the backstop.
- **Beta leads are not publicly readable.** The public can submit but cannot list or read submissions.
- **Service-role key is never client-exposed.** It is read only in `src/lib/supabase/server.ts`, used only in server code, and must never be placed in a `NEXT_PUBLIC_*` variable.
- **No `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.** The project standardises on the anon key.
- **Reflected input is escaped.** Error messages surfaced from query params render as escaped React text (no `dangerouslySetInnerHTML` anywhere).

## Known limitations / residual risks

- **Best-effort persistence uses the service-role client** (quiz sessions, reports, teacher resources, profile provisioning). It bypasses RLS, so its safety depends on the surrounding `requireRole(...)` checks and server-derived ownership (`learner_profiles.user_id = session user`, `teacher_id = session user`). These checks are in place; keep them if refactoring.
- **No server-side idempotency on quiz submission** — a cross-request double-submit (back-button/retry) could create duplicate `quiz_sessions`/`attempts`/`reports`. The client blocks *concurrent* same-tick submits with a synchronous ref guard (`QuizShell`); a DB-level dedupe key (schema change) is future hardening.
- **Parent linking is unbuilt** — do **not** add learner queries to the parent routes until a secure, learner-confirmed linking mechanism exists.
- **No automated security tests** — add auth/role and RLS smoke tests before major changes.

## Do / don't for contributors

- **Do** call `requireRole(...)` at the top of every new protected page/action.
- **Do** keep learner/teacher queries scoped by the session-derived id.
- **Don't** query learner data from parent routes.
- **Don't** import `@/lib/supabase/server` (or the service-role client) into any `"use client"` component.
- **Don't** introduce a `NEXT_PUBLIC_*` service-role or publishable key.
