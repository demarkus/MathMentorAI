# Database — Math Mentor AI

Postgres on Supabase. The **migrations in `supabase/migrations/` are the source of truth** for a fresh database; `supabase/schema.sql` is a **schema-only** reference of the same objects (tables + indexes + RLS + policies + functions — no seed), and `supabase/seed.sql` provides CAPS content.

**Security posture** (from the hardening sprint): `profiles.role` is not client-updatable (only `full_name`); question answer keys (`answer_text`/`hint`/`solution_steps`) are withheld from the Data API; and `attempts`/`quiz_sessions`/`reports` are not client-insertable — writes go through the trusted, atomic, idempotent `finalize_quiz_submission()` (service_role only).

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
- `curriculum_tag` is a **self-applied** label (the content is structured around CAPS Grade 9–10 algebra), **not** an independently-reviewed alignment. See [CURRICULUM_VALIDATION.md](CURRICULUM_VALIDATION.md).
- Unique on `(grade, slug)` — the same slug can exist in both grades.

### `questions`
The question bank.
- `id`, `topic_id` (→ `topics`), `grade`, `question_text`, `answer_text`, `hint`, `solution_steps` (jsonb **array**), `difficulty` (`question_difficulty` enum: `easy` | `medium` | `hard`), `cognitive_level` (default `routine procedure`), `marks` (>0), `is_active`, `created_at`.
- There is **no `explanation_text` column** — worked steps live in `solution_steps`.

### `quiz_sessions` *(migration `…120000`; issued-session fields `…022709`)*
One row per diagnostic/practice run — created at start, finalized on submit.
- `id`, `learner_id` (→ `learner_profiles`), `quiz_type` (`diagnostic` | `practice`), `score`, `total_marks`, `percentage`, `created_at`.
- Issued-session fields: `status` (`issued` | `submitted`), `topic_id` (→ `topics`, practice), `grade`, `question_ids` (`uuid[]` — the persisted issued set), `submission_key` (unique — idempotency), `expires_at` (default +2h — issued sessions are only started by an explicit learner action and expire; abandoned ones are reclaimed by `cleanup_expired_sessions()`).

### `attempts`
Per-question answer records. **Written only by `finalize_quiz_submission()`** (no client insert).
- `id`, `learner_id` (→ `learner_profiles`), `question_id` (→ `questions`), `submitted_answer`, `is_correct`, `score`, `time_spent_seconds`, `created_at`.
- `quiz_session_id` (→ `quiz_sessions`) added by migration `…130000`.

### `reports` *(migration `…120000`)*
Persisted result summaries.
- `id`, `learner_id`, `quiz_session_id`, `report_type` (`diagnostic` | `practice` | `progress`), `data` (jsonb object), `created_at`.

### `teacher_resources` *(migration `…140000`)*
Teacher-generated resources.
- `id`, `teacher_id` (→ `profiles`), `title`, `grade`, `topic_id` (→ `topics`, nullable), `resource_type` (text check: `worksheet` | `test` | `memo` | `revision_pack`), `content` (jsonb object), `created_at`.

### `beta_leads` *(migration `…182712`)*
Public beta sign-ups.
- `id`, `full_name`, `email`, `phone`, `role` (check: `learner` | `parent` | `teacher` | `tutor` | `school_admin`), `selected_plan`, `message`, `ip` (inet, anti-abuse — admin-only), `created_at`.
- Length-capped (`beta_leads_len_ck`). **Direct insert is revoked**; all writes go through `submit_beta_lead()` (validates, rate-limits per email/IP over 10 min, dedupes per email+plan).

### `parent_learner_links` *(migration `…100000`)*
Secure parent-learner linking: a parent invites a learner by email; only an **accepted** link grants read access.
- `id`, `parent_id` (→ `profiles`), `learner_email` (lowercase, length + format check), `learner_id` (→ `profiles`, nullable — set by the learner on response), `status` (check: `pending` | `accepted` | `rejected`, default `pending`), `created_at`.
- Unique on `(parent_id, learner_email)` — re-inviting requires removing the old link first.
- **Column-scoped writes**: clients may insert only `(parent_id, learner_email)` and update only `(status, learner_id)`; RLS restricts inserts to the parent themselves (role-checked) and updates to the addressed learner, who may only decide (`accepted`/`rejected`) and only bind `learner_id` to themselves.

## Migrations (apply in filename order)

| Order | File | Adds |
|-------|------|------|
| 1 | `20260630012144_initial_math_mentor_schema.sql` | `profiles`, `learner_profiles`, `topics`, `questions`, `attempts`; RLS, grants, `handle_new_user` trigger; seed CTE |
| 2 | `20260702120000_add_quiz_sessions_and_reports.sql` | `quiz_sessions`, `reports` (+ RLS) |
| 3 | `20260702130000_link_attempts_to_quiz_sessions.sql` | `attempts.quiz_session_id` link column |
| 4 | `20260702140000_add_teacher_resources.sql` | `teacher_resources` (+ RLS, owner + admin policies) |
| 5 | `20260702182712_add_beta_leads.sql` | `beta_leads` (+ RLS, public insert / admin select) |
| 6 | `20260704014402_secure_roles.sql` | column-scoped `profiles` UPDATE (full_name only); `complete_onboarding()` |
| 7 | `20260704020846_protect_answer_keys.sql` | column-scoped `questions` SELECT (withholds answer keys) |
| 8 | `20260704022709_trusted_submission.sql` | revoke client INSERT on `attempts`/`quiz_sessions`/`reports`; issued-session columns; `finalize_quiz_submission()` |
| 9 | `20260704110237_enforce_question_topic_grade.sql` | composite FK `questions(topic_id, grade)` → `topics(id, grade)` so a question's grade must match its topic's grade |
| 10 | `20260704113638_tighten_rls_role_semantics.sql` | insert/update RLS on `learner_profiles` (role `student`) and `teacher_resources` (role `teacher`) now require the matching profile role, not just ownership |
| 11 | `20260704115128_add_session_expiry_and_cleanup.sql` | `quiz_sessions.expires_at` (default +2h) + `(learner_id, status)` / `(status, expires_at)` indexes + `cleanup_expired_sessions()` |
| 12 | `20260704130052_harden_beta_leads.sql` | `beta_leads` length caps + `ip` column; revoke direct insert; `submit_beta_lead()` (validate + rate-limit + dedupe) |
| 13 | `20260704140000_beta_lead_db_boundary.sql` | `beta_leads` plan allow-list check + unique `(email, plan)` index; `submit_beta_lead()` becomes service-role-only, enforces the plan allow-list, advisory-locked rate limit, and on-conflict dedup |
| 14 | `20260704150000_bound_quiz_abuse.sql` | `attempts` answer-length CHECK (≤500, backstop); partial index on active issued `quiz_sessions` for the reuse/cap lookup |
| 15 | `20260705100000_add_parent_learner_links.sql` | `parent_learner_links` (+ RLS, column-scoped grants); additive SELECT policies letting a parent with an **accepted** link read the linked learner's `learner_profiles`/`quiz_sessions`/`attempts`/`reports` |

**Quiz abuse/storage bounds:** submitted answers are capped at 500 chars in the browser (`maxLength`), the Server Actions (rejected before grading/persistence), and the DB (`attempts_answer_len_ck`). A learner cannot pile up unbounded issued sessions: `startSession` reuses a still-active session of the same type/topic/grade (so a refresh or double-click resumes), and otherwise enforces a cap of `MAX_ACTIVE_ISSUED_SESSIONS` (10) simultaneously-issued sessions. Idempotent finalisation and retries are unchanged.

Migrations are **additive** and apply in filename order, each **exactly once**. Most use guards (`if not exists`, drop-then-create on policies/indexes), but not all are safe to replay — treat them as one-shot, not idempotent.

A question's `grade` must equal its topic's `grade`: migration 9 adds a unique key on `topics(id, grade)` and a composite FK from `questions(topic_id, grade)`. The admin create/edit actions also verify the pair server-side for a friendly error before the DB rejects it.

## Seed data (`supabase/seed.sql`)

- **14 topics** — 7 per grade: Factorisation, Linear equations, Algebraic fractions, Simultaneous equations, Exponents, Functions basics, Number patterns.
- **108 questions** — 54 Grade 9 + 54 Grade 10, spread across those topics, with `answer_text`, `hint`, and `solution_steps`.
- **Safe to re-run** — topics upsert on `(grade, slug)`; questions insert only when an identical `question_text` isn't already present for that topic (topics resolved by `grade + slug` join, no hardcoded UUIDs).
- **Non-destructive reconciliation** — the migration baseline is reconciled by an explicit allow-list of the known baseline fingerprint (grade + slug + question_text + answer_text + hint). Only unattempted, unedited baseline rows are removed and the empty baseline `exam-revision` topic is dropped; **custom topics/questions, edited baseline rows, and any attempted rows are always preserved**.

## RLS overview

RLS is enabled on **every** table. Summary of who can do what:

| Table | Public (anon) | Authenticated user | Admin |
|-------|---------------|--------------------|-------|
| `profiles` | — | select **own**; update **`full_name` only** | own only |
| `learner_profiles` | — | select/update **own**; insert own **only if role = student**; **linked parent may select** (accepted link) | own only |
| `topics` | select | select | select |
| `questions` | select (active, **render columns only**) | select (active, render columns only) | full via service role in admin |
| `quiz_sessions` | — | select **own** (no client insert); **linked parent may select** | own only |
| `attempts` | — | select **own** (no client insert); **linked parent may select** | own only |
| `reports` | — | select **own** (no client insert); **linked parent may select** | own only |
| `teacher_resources` | — | select/delete **own**; insert/update own **only if role = teacher** | **select all** |
| `beta_leads` | — (write via `submit_beta_lead()` only) | — (write via `submit_beta_lead()` only) | **select all** |
| `parent_learner_links` | — | parent: select/insert/delete **own** (insert role-checked, `(parent_id, learner_email)` only); learner: select/update links **addressed to their email** (`(status, learner_id)` only, self-binding enforced) | — |

Notes:
- `questions` answer keys (`answer_text`, `hint`, `solution_steps`) are **not granted** to anon/authenticated; only render columns are. `profiles.role`/`email` are **not client-updatable**.
- `attempts`/`quiz_sessions`/`reports` **cannot be inserted by clients**; writes go through the trusted, atomic, idempotent `finalize_quiz_submission()` function (`service_role` only), and quiz sessions are created server-side with a persisted issued question set.
- Server code reaches answer keys / writes via the **service-role client**, only ever after `requireRole(...)` and server-derived ownership.
- Functions: `handle_new_user` (trigger), `complete_onboarding` (authenticated), `finalize_quiz_submission` (service_role only), `cleanup_expired_sessions` (service_role only — deletes abandoned issued sessions past expiry; scheduling in [DEPLOYMENT.md](DEPLOYMENT.md)), `submit_beta_lead` (**service_role only** — invoked from the validated Server Action; validates, enforces the plan allow-list, advisory-locked rate limit, and on-conflict dedup).
