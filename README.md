# Math Mentor AI

**Math Mentor AI** is a CAPS-aligned **Grade 9 & 10 Algebra Booster** for South African learners. It helps learners find their weak algebra topics with a short diagnostic, practise them with hints and worked solutions, and see measurable progress — while giving parents, teachers, and admins their own tools around that core.

The product is organised into four role-based modules:

- **Learner** — topic catalogue, diagnostic quiz, topic practice, and a progress dashboard.
- **Parent** — a progress-report area (placeholder until secure parent–learner linking ships).
- **Teacher** — "TeacherMate" worksheet/test/memo generator and a saved-resources library.
- **Admin** — question-bank and topic content management.

> 📚 Deeper documentation lives in [`docs/`](docs): [Product Brief](docs/PRODUCT_BRIEF.md) · [MVP Scope](docs/MVP_SCOPE.md) · [Database](docs/DATABASE.md) · [Roadmap](docs/ROADMAP.md) · [Security Notes](docs/SECURITY_NOTES.md) · [Deployment](docs/DEPLOYMENT.md).

---

## Current MVP features

| Area | Feature | Status |
|------|---------|--------|
| Marketing | Landing page | ✅ |
| Marketing | Pricing page (5 plans) | ✅ |
| Marketing | Beta lead capture form | ✅ |
| Auth | Email/password sign-up & sign-in (Supabase SSR) | ✅ |
| Auth | Role selection + role-routed dashboard | ✅ |
| Learner | Topic catalogue (Grade 9 & 10) | ✅ |
| Learner | Diagnostic quiz engine | ✅ |
| Learner | Topic practice engine (hints + worked solutions) | ✅ |
| Learner | Progress dashboard | ✅ |
| Parent | Progress report area | ⏳ Placeholder (linking not built) |
| Teacher | Worksheet / test / memo / revision generator | ✅ |
| Teacher | Saved resources library | ✅ (requires migration applied) |
| Admin | Question management (create / edit / deactivate) | ✅ |
| Admin | Topic catalogue (read-only) | ✅ |

See [docs/MVP_SCOPE.md](docs/MVP_SCOPE.md) for what is intentionally excluded.

---

## Tech stack

- **Next.js 16** (App Router, Server Actions, `proxy.ts` middleware)
- **TypeScript**
- **Tailwind CSS v4**
- **Supabase Auth** (cookie-based SSR via `@supabase/ssr`)
- **Supabase Postgres** with **Row Level Security (RLS)** policies
- **pnpm** for package management

No CSS-in-JS is used. Automated tests run on **Vitest** (unit), a gated **Vitest integration** suite against a dedicated Supabase project, and **Playwright** E2E — all wired into **GitHub Actions CI**. See [Testing](#testing).

---

## Folder structure

```
.
├── src/
│   ├── app/                    # Next.js App Router routes (pages, layouts, server actions, route handlers)
│   │   ├── (app)/              # /dashboard router + /practice compat redirect
│   │   ├── (auth)/             # login/signup compat redirects + shared auth server actions
│   │   ├── auth/               # sign-in, sign-up, callback, sign-out
│   │   ├── learner/            # topics, diagnostic, practice, progress
│   │   ├── parent/             # reports (placeholder)
│   │   ├── teacher/            # generator, resources
│   │   ├── admin/              # questions, topics
│   │   ├── beta/  pricing/     # marketing
│   │   └── onboarding/         # learner grade capture
│   ├── components/
│   │   ├── ui/                 # shared primitives (Card, Badge, Alert, EmptyState, LoadingState, field)
│   │   ├── dashboard/ quiz/ reports/ teacher/ admin/ marketing/
│   │   └── *.tsx               # site header, role header, auth form, etc.
│   └── lib/
│       ├── auth/               # get-current-user, require-role
│       ├── supabase/           # server, client, proxy (env-driven clients)
│       ├── math/               # check-answer, diagnostic, practice, progress, teacher-resources
│       ├── quiz/               # persistence helpers
│       ├── progress/           # load-progress
│       └── marketing/          # plans
├── supabase/
│   ├── schema.sql              # reference schema ONLY (tables + indexes + RLS + policies + functions; no seed)
│   ├── seed.sql                # 14 topics + 108 questions (allow-list reconcile; rerunnable)
│   └── migrations/             # ordered, additive migrations (source of truth for a fresh DB)
├── docs/                       # product, scope, database, roadmap, security, deployment
└── .env.example
```

---

## Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase project values:

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL (used by the browser, server, and proxy clients). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key. All normal, RLS-scoped client/server reads and writes use this. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Bypasses RLS. Used only in server code to provision profile rows and best-effort persistence (quiz sessions, reports, teacher resources). **Never** exposed to the client. |

**Do not add or use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** — this project standardises on the anon key, and a `NEXT_PUBLIC_*` publishable key is intentionally avoided. Keep the service-role key out of any `NEXT_PUBLIC_*` variable and out of client components.

---

## Local development

```bash
pnpm install
pnpm dev      # start the dev server on http://localhost:3000
pnpm lint     # eslint
pnpm build    # production build
pnpm test     # unit tests (Vitest)
```

Authentication and persistence require a configured Supabase project (see below).

### Testing

Unit tests run on **Vitest** (`pnpm test`). Tests live in `tests/` and are
excluded from the app `tsconfig`/lint; the `@` path alias is mirrored in
`vitest.config.ts` so tests import source modules the way the app does.

- **Covered:** `check-answer` (grading + `x = 5`↔`5` equivalence and its
  documented limits), `answer-format`, `result-band`, `progress` (topic
  performance, weak/strong topics, recommendations, averages), `diagnostic` and
  `practice` (selection, grading, recommendations, summary shape guards),
  `teacher-resources` (generator input validation + question selection),
  `marketing/plans` (beta-lead plan/role validators), and `require-role`
  (role→redirect access decisions incl. the learner→`student` mapping, with
  `getCurrentUser` and `next/navigation` mocked).
**Integration / RLS tests** (`pnpm test:integration`) run the `tests/integration/`
suite against a **dedicated, non-production** Supabase project. They are gated on
`INTEGRATION_SUPABASE_*` env vars and **skip** when absent, so the unit run stays
offline. They assert the RLS boundaries the unit suite can't (owner-scoping,
admin visibility, role-scoped writes, trusted submission/beta paths, and the
`beta_leads` write-via-function / no-public-read shape). Setup is in
[docs/TESTING_E2E_PLAN.md](docs/TESTING_E2E_PLAN.md).

**E2E tests** (`pnpm test:e2e`, Playwright) drive real Chromium against the app —
marketing, routing/protection, and auth journeys run with a placeholder backend
(no real project needed). First run: `pnpm exec playwright install chromium`.

**CI** — GitHub Actions (`.github/workflows/ci.yml`) runs lint, build, the unit
suite, and the gated integration + E2E suites on every push/PR.

---

## Supabase setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **Configure env vars** — copy the project URL and anon key into `.env.local`; add the service-role key (Project Settings → API).
3. **Run the migrations** in order — apply each **exactly once**, in filename order. They are additive; most use `if not exists` / drop-then-create guards, but not every migration is safe to re-run, so do not replay them. Either link the Supabase CLI and run `pnpm dlx supabase db push`, or paste each file from `supabase/migrations/` into the SQL editor in order:
   1. `20260630012144_initial_math_mentor_schema.sql`
   2. `20260702120000_add_quiz_sessions_and_reports.sql`
   3. `20260702130000_link_attempts_to_quiz_sessions.sql`
   4. `20260702140000_add_teacher_resources.sql`
   5. `20260702182712_add_beta_leads.sql`
   6. `20260704014402_secure_roles.sql`
   7. `20260704020846_protect_answer_keys.sql`
   8. `20260704022709_trusted_submission.sql`
   9. `20260704110237_enforce_question_topic_grade.sql`
   10. `20260704113638_tighten_rls_role_semantics.sql`
   11. `20260704115128_add_session_expiry_and_cleanup.sql`
   12. `20260704130052_harden_beta_leads.sql`
4. **Run the seed** — execute `supabase/seed.sql` (one command, safe to re-run). It reconciles only the **known baseline fingerprint** by an explicit allow-list: superseded baseline rows (unattempted, unedited) are replaced by the canonical set and the empty baseline `exam-revision` topic is dropped, while **custom admin topics/questions, edited rows, and any attempted rows are preserved** → clean 14 topics / 108 questions.
5. **Enable email/password auth** — Authentication → Providers → Email. Set the Site URL and add `<your-app>/auth/callback` as a redirect URL for email confirmation.
6. **RLS** is defined inside the SQL — every sensitive table has RLS enabled with owner-scoped policies. `supabase/schema.sql` is a **schema-only** reference of the same objects (never a setup path).

---

## Database overview

| Table | Purpose |
|-------|---------|
| `profiles` | One row per auth user: email, full name, role. |
| `learner_profiles` | Learner grade and school info, linked to a profile. |
| `topics` | CAPS topic catalogue (Grade 9 & 10). |
| `questions` | Question bank (text, answer, hint, `solution_steps`, difficulty, marks, `is_active`). |
| `quiz_sessions` | One row per completed diagnostic/practice run. |
| `attempts` | Per-question answer records, optionally linked to a quiz session. |
| `reports` | Persisted diagnostic/practice/progress summaries (jsonb). |
| `teacher_resources` | Teacher-generated worksheets/tests/memos (owner-scoped). |
| `beta_leads` | Public beta sign-up submissions (insert-only for the public). |

Full column and RLS detail is in [docs/DATABASE.md](docs/DATABASE.md).

---

## Route map

**Public:** `/` · `/pricing` · `/beta`

**Auth & onboarding:** `/auth/sign-in` · `/auth/sign-up` · `/auth/callback` · `/auth/sign-out` · `/onboarding`

**Learner:** `/learner` · `/learner/topics` · `/learner/topics/[slug]` · `/learner/diagnostic` · `/learner/diagnostic/result` · `/learner/practice` · `/learner/practice/[topicSlug]` · `/learner/practice/[topicSlug]/result` · `/learner/progress`

**Parent:** `/parent` · `/parent/reports` · `/parent/reports/[learnerId]` (placeholder — no learner data queried)

**Teacher:** `/teacher` · `/teacher/generator` · `/teacher/resources` · `/teacher/resources/[id]`

**Admin:** `/admin` · `/admin/topics` · `/admin/questions` · `/admin/questions/new` · `/admin/questions/[id]/edit`

**Dashboard router:** `/dashboard` redirects to the module for the signed-in role.

**Compatibility redirects:** `/login` → `/auth/sign-in` · `/signup` → `/auth/sign-up` · `/practice` → `/learner/practice` · `/auth/signout` → `/auth/sign-out`

---

## Security notes

- **Role-based route protection** — every learner/parent/teacher/admin page and server action calls `requireRole(...)`; the `proxy.ts` middleware redirects unauthenticated users away from protected prefixes. Server-side auth is verified with `getClaims()`.
- **RLS ownership** — learners read/write only their own `learner_profiles`, `attempts`, `quiz_sessions`, and `reports`. Topics and active questions are public read-only content.
- **Parent reports do not expose learner data** — the report pages are placeholders; `/parent/reports/[learnerId]` ignores the param and queries nothing, pending secure linking.
- **Teacher resources are owner-scoped** — queries filter by `teacher_id`, detail routes 404 on non-owned ids, and RLS enforces owner-only access (admins may read all).
- **Beta leads** allow public **insert** but **no public read** (admin-only select).
- **Service-role key must never be exposed client-side** — it is read only in `src/lib/supabase/server.ts` and used only in server code.

More detail: [docs/SECURITY_NOTES.md](docs/SECURITY_NOTES.md).

---

## Current limitations

- **No live payments** — pricing/beta capture leads only; no PayFast/Yoco/Stripe integration.
- **Parent–learner linking not implemented** — parent report pages are safe placeholders.
- **No AI explanations** — hints and worked steps come from seeded `solution_steps`, not a model.
- **Answer checking is deterministic/string-based** — `normalizeAnswer` (NFKC, whitespace/operator normalisation), not symbolic algebra.
- **Some persistence depends on migrations** — `teacher_resources`, `beta_leads`, and the security hardening (secure roles, protected answer keys, trusted submission, topic/grade FK, RLS role semantics, session expiry, beta-lead function) are only in force once their migrations are applied; the app degrades gracefully (placeholders) when they are absent.
- **Email templates provided, install pending** — branded HTML lives in `supabase/templates/`; paste it into the Supabase dashboard ([docs/EMAIL_TEMPLATES.md](docs/EMAIL_TEMPLATES.md)). Supabase defaults are used until then.
- **Test layers** — Vitest unit (`pnpm test`), a gated Vitest integration/RLS suite against a dedicated test project (`pnpm test:integration`), and Playwright E2E (`pnpm test:e2e`), all run in CI. The integration/E2E suites need their env secrets (and the migrations applied to the test project) to execute; they skip otherwise.

---

## Deployment notes

Deploy the Next.js app to **Vercel** and point it at your Supabase project:

1. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the Vercel project's Environment Variables (service-role key as a plain, non-`NEXT_PUBLIC` var).
2. Apply all migrations to the production database (`pnpm dlx supabase db push` against the linked project, or run each file in order in the SQL editor). Run `supabase/seed.sql` if you want the CAPS content.
3. Configure the Supabase Site URL and `/auth/callback` redirect for the production domain.
4. **Smoke test** after deploy: `/`, `/pricing`, `/beta` (submit a lead), sign-up → onboarding → `/learner`, run a diagnostic and a practice set, `/teacher/generator`, `/admin/questions`.

Full steps and checklist: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Roadmap (summary)

PayFast/Yoco/Stripe payments · parent–learner linking · improved symbolic answer checking · AI-guided hints/explanations · PDF export for reports and worksheets · analytics · a fuller beta onboarding flow. See [docs/ROADMAP.md](docs/ROADMAP.md).
