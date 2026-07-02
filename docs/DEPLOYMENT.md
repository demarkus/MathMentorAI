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

Then load CAPS content (safe to re-run):

```
supabase/seed.sql   # 14 topics + 108 questions
```

> `supabase/schema.sql` is a full reference copy of all objects — handy for review, but the **migrations** are what you apply to a real database.

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
- Run `supabase/seed.sql` if you want the CAPS catalogue in production.
- Confirm RLS is on for every table (it is defined in the SQL) — Supabase → Authentication → Policies.

## 6. Production smoke-test checklist

After each deploy, verify:

- [ ] `/` loads; header links to `/pricing` and `/beta`.
- [ ] `/pricing` shows all five plans; a plan CTA deep-links to `/beta?plan=…`.
- [ ] `/beta` submits successfully (creates a `beta_leads` row) and shows the success state; invalid input shows the error state.
- [ ] Sign-up (learner) → email confirm (if enabled) → `/onboarding` → grade saved → `/learner`.
- [ ] Sign-in / sign-out work; unauthenticated access to `/learner`, `/teacher`, `/admin` redirects to sign-in.
- [ ] Wrong-role access redirects to `/dashboard`.
- [ ] Learner: run the **diagnostic** end-to-end; result page renders; `/learner/practice/<topic>` runs and shows results; `/learner/progress` shows data.
- [ ] Teacher: `/teacher/generator` produces a resource, print works; `/teacher/resources` lists saved items (post-migration).
- [ ] Admin: `/admin/questions` lists/filters; create, edit, and deactivate a question; `/admin/topics` renders.
- [ ] `/parent/reports` shows placeholders and never learner data.

## Rollback / safety

- Migrations are additive; there are no destructive down-migrations in this repo. To roll back the **app**, redeploy a previous Vercel build — the database schema remains forward-compatible.
- Keep the service-role key rotation-ready; if it leaks, rotate it in Supabase and update the Vercel env var.
