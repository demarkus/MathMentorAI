# Database — Math Mentor AI

Postgres on Supabase. The **migrations in `supabase/migrations/` are the source of truth** for a fresh database; `supabase/schema.sql` is a full reference copy of the same objects (tables + RLS + policies), and `supabase/seed.sql` provides CAPS content.

## Tables

### `profiles`
One row per authenticated user.
- `id` (uuid, PK → `auth.users`), `email`, `full_name`, `role` (`user_role` enum: `student` | `parent` | `teacher` | `admin`), `created_at`, `updated_at`.
- The learner role is stored as `student`.

### `learner_profiles`
Learner-specific data.
- `id` (uuid, PK), `user_id` (uuid, unique → `profiles`), `grade` (9 or 10), `school_name`, `target_score` (0–100), `created_at`.

### `topics`
CAPS topic catalogue.
- `id`, `grade` (9/10), `name`, `slug`, `description`, `curriculum_tag` (default `CAPS`), `display_order`, `created_at`.
- Unique on `(grade, slug)` — the same slug can exist in both grades.

### `questions`
The question bank.
- `id`, `topic_id` (→ `topics`), `grade`, `question_text`, `answer_text`, `hint`, `solution_steps` (jsonb **array**), `difficulty` (`question_difficulty` enum: `easy` | `medium` | `hard`), `cognitive_level` (default `routine procedure`), `marks` (>0), `is_active`, `created_at`.
- There is **no `explanation_text` column** — worked steps live in `solution_steps`.

### `quiz_sessions` *(migration `…120000`)*
One row per completed diagnostic/practice run.
- `id`, `learner_id` (→ `learner_profiles`), `quiz_type` (`diagnostic` | `practice`), `score`, `total_marks`, `percentage`, `created_at`.

### `attempts`
Per-question answer records.
- `id`, `learner_id` (→ `learner_profiles`), `question_id` (→ `questions`), `submitted_answer`, `is_correct`, `score`, `time_spent_seconds`, `created_at`.
- `quiz_session_id` (→ `quiz_sessions`) added by migration `…130000`; persistence falls back to unlinked attempts if that column is absent.

### `reports` *(migration `…120000`)*
Persisted result summaries.
- `id`, `learner_id`, `quiz_session_id`, `report_type` (`diagnostic` | `practice` | `progress`), `data` (jsonb object), `created_at`.

### `teacher_resources` *(migration `…140000`)*
Teacher-generated resources.
- `id`, `teacher_id` (→ `profiles`), `title`, `grade`, `topic_id` (→ `topics`, nullable), `resource_type` (text check: `worksheet` | `test` | `memo` | `revision_pack`), `content` (jsonb object), `created_at`.

### `beta_leads` *(migration `…182712`)*
Public beta sign-ups.
- `id`, `full_name`, `email`, `phone`, `role` (check: `learner` | `parent` | `teacher` | `tutor` | `school_admin`), `selected_plan`, `message`, `created_at`.

## Migrations (apply in filename order)

| Order | File | Adds |
|-------|------|------|
| 1 | `20260630012144_initial_math_mentor_schema.sql` | `profiles`, `learner_profiles`, `topics`, `questions`, `attempts`; RLS, grants, `handle_new_user` trigger; seed CTE |
| 2 | `20260702120000_add_quiz_sessions_and_reports.sql` | `quiz_sessions`, `reports` (+ RLS) |
| 3 | `20260702130000_link_attempts_to_quiz_sessions.sql` | `attempts.quiz_session_id` link column |
| 4 | `20260702140000_add_teacher_resources.sql` | `teacher_resources` (+ RLS, owner + admin policies) |
| 5 | `20260702182712_add_beta_leads.sql` | `beta_leads` (+ RLS, public insert / admin select) |

Migrations 2–5 are **additive and idempotent** (guards on tables, indexes, and policies), and their column shapes match the application inserts, so features begin persisting with no code change once applied.

## Seed data (`supabase/seed.sql`)

- **14 topics** — 7 per grade: Factorisation, Linear equations, Algebraic fractions, Simultaneous equations, Exponents, Functions basics, Number patterns.
- **108 questions** — 54 Grade 9 + 54 Grade 10, spread across those topics, with `answer_text`, `hint`, and `solution_steps`.
- **Idempotent** — topics upsert on `(grade, slug)`; questions insert only when an identical `question_text` isn't already present for that topic. Topics are resolved by `grade + slug` join (no hardcoded UUIDs).

## RLS overview

RLS is enabled on **every** table. Summary of who can do what:

| Table | Public (anon) | Authenticated user | Admin |
|-------|---------------|--------------------|-------|
| `profiles` | — | select/update **own** | own only |
| `learner_profiles` | — | select/insert/update **own** | own only |
| `topics` | select | select | select |
| `questions` | select (active only) | select (active only) | full via service role in admin |
| `quiz_sessions` | — | select/insert **own** | own only |
| `attempts` | — | select/insert **own** | own only |
| `reports` | — | select/insert **own** | own only |
| `teacher_resources` | — | select/insert/update/delete **own** | **select all** |
| `beta_leads` | **insert only** | insert | **select all** |

Notes:
- The only public-readable content is `topics` and **active** `questions` (the practice/catalogue surface).
- `beta_leads` is the only table with a public insert; it has **no** public select/update/delete.
- Admin question/topic management and best-effort persistence (sessions/reports/resources) use the **service-role client** in server code, which bypasses RLS but is only ever reached after `requireRole(...)` / server-derived ownership.
