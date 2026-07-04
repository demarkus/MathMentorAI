# MVP Scope — Math Mentor AI

This is the honest, code-backed boundary of the current MVP. Features are only listed as "included" if they exist in the repository today.

## ✅ Included

### Marketing
- Landing page (`/`) with product framing and CTAs.
- Pricing page (`/pricing`) rendering all five plans.
- Beta lead capture (`/beta`) — validated server-side, stored in `beta_leads`, with success/error states.

### Authentication & onboarding
- Email/password sign-up and sign-in via Supabase SSR (cookie-based).
- Sign-up captures full name and role; learner role is stored as `student`.
- Profile row provisioned on sign-up (service-role, server-only).
- Learner onboarding captures grade into `learner_profiles`.
- Role-routed `/dashboard`; sign-out; email-confirmation callback.

### Learner module
- Topic catalogue (`/learner/topics`, `[slug]`) grouped by grade, with duplicate-slug handling.
- Diagnostic quiz: balanced question selection, one-at-a-time flow, scoring, weak/strong topics, persisted RLS-owned report (results load only from the report; no unsigned fallback).
- Topic practice: hints + worked solutions, immediate feedback, per-topic scoring, result page.
- Progress dashboard: average score, topic performance, weak/strong topics, recent activity, recommended next topic.

### Parent module
- Progress-report area (`/parent/reports`) and per-learner route — **placeholders only**, deliberately querying no learner data.

### Teacher module
- TeacherMate generator (`/teacher/generator`): worksheet / test / memo / revision pack from existing questions, input validation (1–30 questions), immediate preview, browser print.
- Saved resources list and detail (owner-scoped), enabled once the `teacher_resources` migration is applied.

### Admin module
- Question management: list with grade/topic/difficulty filters, create, edit, and **deactivate** (no hard delete).
- Read-only topic catalogue.

### Platform
- Shared UI primitives (`Card`, `Badge`, `Alert`, `EmptyState`, `LoadingState`, form `field` helpers).
- Empty / loading / error states across list and fetch surfaces.
- RLS-secured schema with owner-scoped policies.

## 🚫 Intentionally excluded (for now)

- **Live payments / checkout** — no PayFast/Yoco/Stripe; pricing and beta capture leads only.
- **Parent–learner linking** — no mechanism to securely connect a parent to a learner; reports stay placeholders.
- **AI hints/explanations** — explanations come from seeded `solution_steps`, not a model.
- **Symbolic answer checking** — answers are matched with deterministic string normalisation, not a CAS.
- **PDF export** — teacher resources print via the browser; no server-side PDF.
- **Full symbolic/DB-side analytics** — progress uses bounded scans + COUNT aggregates, not a warehouse.
- **Installed production email templates** — branded HTML is provided in `supabase/templates/` ([EMAIL_TEMPLATES.md](EMAIL_TEMPLATES.md)); pasting it into the Supabase dashboard is still pending.
- **Analytics / event tracking** — none.
- **Full user administration** (managing learners/parents/teachers from the admin UI) — not built.

## Beta-readiness checklist

| Item | State |
|------|-------|
| Auth (sign-up / sign-in / sign-out / confirm) | ✅ |
| Role protection on all protected routes | ✅ |
| RLS enabled + owner-scoped on all sensitive tables | ✅ |
| Learner core loop (diagnostic → practice → progress) | ✅ |
| CAPS seed content (14 topics, 108 questions) | ✅ |
| Teacher generator + print | ✅ |
| Admin question management | ✅ |
| Lead capture for pricing/beta | ✅ |
| All migrations applied to the target DB | ⚠️ Required before beta |
| Payment collection | ❌ Roadmap |
| Parent–learner linking | ❌ Roadmap |
| Automated tests | ✅ Unit (Vitest) + gated integration/RLS + Playwright E2E, all in CI |
| Production email templates | ⚠️ Provided in `supabase/templates/`; install in dashboard |

**Before inviting beta users:** apply all twelve migrations (filename order), run the seed, enable email/password auth, and complete the deployment smoke test in [DEPLOYMENT.md](DEPLOYMENT.md).
