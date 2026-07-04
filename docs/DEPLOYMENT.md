# Deployment — Math Mentor AI

## 1. Local setup

```bash
pnpm install
cp .env.example .env.local     # fill in Supabase values
pnpm dev                        # http://localhost:3000
```

Quality gates:

```bash
pnpm lint
pnpm build
pnpm test    # unit tests (Vitest) — deterministic logic + auth/role guard
```

## 2. Supabase setup

1. Create a Supabase project.
2. Get the **Project URL**, **anon key**, and **service-role key** (Project Settings → API).
3. Put them in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — do **not** prefix with `NEXT_PUBLIC_`)
4. **Enable email/password auth:** Authentication → Providers → Email.
5. Set **Site URL** to your app origin and add `<origin>/auth/callback` as a redirect URL (used for email confirmation).
6. **Install the branded email templates** (Authentication → Emails) from `supabase/templates/` — see [EMAIL_TEMPLATES.md](EMAIL_TEMPLATES.md). Optional but recommended before inviting beta users; Supabase defaults are used otherwise.

### Supabase API keys (current contract + future migration)

The app uses the **legacy** key pair, and this is the supported contract today:

- `NEXT_PUBLIC_SUPABASE_URL` — project URL (public).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key; used by the browser + cookie-scoped server client (RLS applies).
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, RLS-bypassing; never `NEXT_PUBLIC_`.

**Future migration to publishable/secret keys.** Supabase is rolling out new API keys (`sb_publishable_…` / `sb_secret_…`) to replace anon/service-role. When adopting them, do it as a *deliberate, additive* change — do **not** rename or drop the current env vars in a way that breaks a running deployment:

1. Keep the existing three vars working; add the new keys alongside (e.g. behind a new, clearly-named var) so old and new can coexist during rollout.
2. Swap the client constructors (`src/lib/supabase/{server,client,proxy}.ts`) to read the new var with a fallback to the legacy one, so a missing new key does not break boot.
3. Verify auth + RLS end-to-end on a test project (the gated integration suite) **before** removing the legacy vars.
4. Only after the new keys are confirmed in every environment, retire the legacy vars.

Never introduce a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` that exposes a secret; the publishable key is public by design, but the **secret** key must stay server-only exactly like the service-role key does today.

## 3. Migrations & seed

Apply migrations **in filename order** (they are additive and idempotent). Either:

```bash
# Option A — Supabase CLI (link the project first)
pnpm dlx supabase db push
```

or paste each file from `supabase/migrations/` into the SQL editor, in this order:

1. `20260630012144_initial_math_mentor_schema.sql`
2. `20260702120000_add_quiz_sessions_and_reports.sql`
3. `20260702130000_link_attempts_to_quiz_sessions.sql`
4. `20260702140000_add_teacher_resources.sql`
5. `20260702182712_add_beta_leads.sql`

Then load CAPS content. **Clear the migration's baseline seed first** — the initial migration (`…012144`) already seeds a smaller baseline (9 topics / 30 questions) in different notation (e.g. `x²`), and `seed.sql`'s duplicate guard only skips *exact* text matches. Without this step you'll get duplicate questions and a leftover `exam-revision` topic. On a fresh database (no learner data yet) this is safe:

```sql
-- 1. clear the baseline the initial migration inserted
delete from public.questions;
delete from public.topics;
```

```
-- 2. run the full seed → clean 14 topics + 108 questions
supabase/seed.sql
```

> `supabase/schema.sql` is a **reference copy only** and is intentionally not a setup path: it is missing `quiz_sessions`, `reports`, and `attempts.quiz_session_id`, and uses bare `create table`. Always set up a real database from the **migrations**, never from `schema.sql`.

### Verify the database after setup

Run these in the SQL editor to confirm a correct, clean setup:

```sql
-- All 9 tables exist
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
-- expect: attempts, beta_leads, learner_profiles, profiles, questions,
--         quiz_sessions, reports, teacher_resources, topics

-- RLS enabled on every table (all rows true)
select relname, relrowsecurity from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname;

-- attempts is linked to quiz sessions
select column_name from information_schema.columns
where table_schema='public' and table_name='attempts' and column_name='quiz_session_id';
-- expect: 1 row

-- Clean seed counts
select count(*) as topics from public.topics;                 -- expect 14
select grade, count(*) from public.questions group by grade;  -- expect 9 -> 54, 10 -> 54
select count(*) as questions from public.questions;           -- expect 108

-- No duplicate questions (must return 0 rows — confirms the baseline was cleared)
select topic_id, question_text, count(*)
from public.questions group by topic_id, question_text having count(*) > 1;

-- beta_leads = public insert, admin-only select; teacher_resources = owner-scoped
select tablename, policyname, cmd, roles from pg_policies
where schemaname='public' and tablename in ('beta_leads','teacher_resources')
order by tablename, cmd;
```

## 4. Vercel deployment

1. Import the repo into Vercel (framework preset: Next.js).
2. Add Environment Variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — plain (non-`NEXT_PUBLIC`) so it stays server-only.
3. Deploy. Build command `next build`, install with pnpm (auto-detected from `pnpm-lock.yaml`).
4. Update Supabase **Site URL** and the `/auth/callback` redirect to the production domain.

## 5. Production database steps

- Apply **all five migrations** to the production database before inviting users (teacher resources, quiz sessions, reports, and beta leads persist only once their migrations exist; the app degrades gracefully otherwise, but a beta should have them applied).
- If you want the CAPS catalogue in production, load it using the **clear-baseline-then-seed** procedure in §3 (clear the migration baseline, then run `supabase/seed.sql`) so you get a clean 14 topics / 108 questions with no duplicates.
- Confirm RLS is on for every table (it is defined in the SQL) — Supabase → Authentication → Policies.

## 6. Production smoke-test checklist

After each deploy, verify:

- [ ] `/` loads; header links to `/pricing` and `/beta`.
- [ ] `/pricing` shows all five plans; a plan CTA deep-links to `/beta?plan=…`.
- [ ] `/beta` submits successfully (creates a `beta_leads` row) and shows the success state; invalid input shows the error state.
- [ ] Sign-up (learner) → email confirm (if enabled) → `/onboarding` → grade saved → `/learner/diagnostic` (new-learner guidance; parent/teacher land on `/dashboard`).
- [ ] Sign-in / sign-out work; unauthenticated access to `/learner`, `/teacher`, `/admin` redirects to sign-in.
- [ ] Wrong-role access redirects to `/dashboard`.
- [ ] Learner: run the **diagnostic** end-to-end; result page renders; `/learner/practice/<topic>` runs and shows results; `/learner/progress` shows data.
- [ ] Teacher: `/teacher/generator` produces a resource, print works; `/teacher/resources` lists saved items (post-migration).
- [ ] Admin: `/admin/questions` lists/filters; create, edit, and deactivate a question; `/admin/topics` renders.
- [ ] `/parent/reports` shows placeholders and never learner data.

## Rollback / safety

- Migrations are additive; there are no destructive down-migrations in this repo. To roll back the **app**, redeploy a previous Vercel build — the database schema remains forward-compatible.
- Keep the service-role key rotation-ready; if it leaks, rotate it in Supabase and update the Vercel env var.
