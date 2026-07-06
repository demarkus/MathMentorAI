# Beta Smoke Test — Math Mentor AI

End-to-end manual checklist for verifying the app before and during early beta.
Run against a database that has all migrations applied and `supabase/seed.sql`
loaded (see [DEPLOYMENT.md](DEPLOYMENT.md)). Related QA for the learning flow:
[LEARNING_EXPERIENCE_QA.md](LEARNING_EXPERIENCE_QA.md).

Legend: **Route** → **Expected result**.

## 1. Public marketing
- [ ] `/` → landing loads; hero CTAs go to `/beta`, `/pricing`, `/auth/sign-up`; header links to `/pricing`, `/auth/sign-in`, `/auth/sign-up`.
- [ ] `/pricing` → all five plans render; each "Choose <plan>" deep-links to `/beta?plan=<id>`.
- [ ] `/beta` → form loads; when arriving with `?plan=` the plan is preselected and named.
- [ ] `/beta` submit with a blank name / invalid email / no plan → a clear inline error (server-validated); no row created.
- [ ] `/beta` valid submit → success state ("You're on the list!"); a `beta_leads` row is created.

## 2. Auth & routing
- [ ] `/auth/sign-up` → can create **learner**, **parent**, **teacher** accounts. **Admin is NOT offered** (provisioned out-of-band only).
- [ ] After sign-up, a `profiles` row exists with the correct role (learner stored as `student`).
- [ ] Email-confirmation path: if confirmation is on, user is sent to sign-in with a "check your email" message; `/auth/callback?code=…` exchanges the code and lands on `/dashboard`.
- [ ] `/dashboard` → redirects by role: student→`/learner`, parent→`/parent`, teacher→`/teacher`, admin→`/admin`; no role→`/onboarding`.
- [ ] **Onboarding flow:** completing `/onboarding` as a **learner** saves role+grade and lands on `/learner/diagnostic` (new-learner guidance); **parent/teacher** land on `/dashboard`. If no questions are seeded, the diagnostic shows a graceful "back to dashboard" message.
- [ ] `/auth/sign-out` → session cleared, redirected to sign-in.
- [ ] Legacy redirects: `/login`→`/auth/sign-in`, `/signup`→`/auth/sign-up`, `/practice`→`/learner/practice`, `/auth/signout`→`/auth/sign-out`.
- [ ] Unauthenticated access to `/learner`, `/parent`, `/teacher`, `/admin` → redirected to sign-in.
- [ ] Wrong-role access (e.g. learner → `/admin`) → redirected to `/dashboard`.

## 3. Learner
- [ ] `/learner` → dashboard renders for the learner.
- [ ] `/learner/topics` → seeded topics listed, grouped by grade.
- [ ] `/learner/topics/<valid-slug>` → topic detail with active-question count and a "Your progress" card (mastery % + badge after practising; "You haven't practised this topic yet" before).
- [ ] `/learner/topics/<invalid-slug>` → not-found (no crash).
- [ ] `/learner/diagnostic` → question set loads across Grade 9/10; question text renders `x^2`-style exponents as superscripts, simple fractions (`2/x`) stacked, and `√(…)` with an overline.
- [ ] Quiz navigation strip (diagnostic & practice) → numbered buttons above the question; clicking jumps to that question; answered numbers show filled, unanswered outlined, current ringed.
- [ ] Submitting with unanswered questions → "Submit anyway?" confirmation; Cancel keeps the quiz open, OK submits.
- [ ] Diagnostic submit → session, attempts, and report persist (when tables present); result page shows score, band, next steps, **and a question-by-question review** (learner answer vs correct answer side by side, hint, worked steps).
- [ ] `/learner/diagnostic/result` with no data → empty state with CTAs.
- [ ] `/learner/practice` → topic list; choosing a topic loads a practice set.
- [ ] `/learner/practice/<topicSlug>` → check/answer reveals feedback (hint, worked steps); submit reaches the result page.
- [ ] Practice result → score, band, mistakes (question, learner answer, correct answer, worked steps), next-step CTAs, and a "Practise [Topic Name] next" CTA when a different topic is recommended.
- [ ] `/learner/progress` with no attempts → empty state (does not crash).
- [ ] `/learner/progress` after attempts → stats, strengths/focus, topic table, recent activity.

## 4. Parent (privacy-critical)
- [ ] `/parent`, `/parent/reports`, `/parent/reports/<anyId>` → require the parent role.
- [ ] `/parent/reports` → invite form sends a link request by learner email (invalid/own email rejected inline; duplicate invite gives a friendly error); pending/active links list correctly.
- [ ] The invited learner sees the request as a banner on `/learner` and can **Accept** or **Reject**; only the addressed learner sees it.
- [ ] Before acceptance (pending/rejected/no link), `/parent/reports/<learnerId>` shows "This report isn’t available" — **no learner data**.
- [ ] After acceptance, `/parent/reports/<learnerId>` shows the linked learner's real stats (quizzes, attempts, average, weak topics, recommendations) — and only for that parent; a different parent account still gets the denied state.
- [ ] **Remove** on a link (pending or active) deletes it and immediately revokes report access.

## 5. Teacher (ownership-critical)
- [ ] `/teacher`, `/teacher/generator`, `/teacher/resources`, `/teacher/resources/<id>` → require the teacher role.
- [ ] Generator loads topics; validates grade, topic, question count, difficulty, and resource type server-side.
- [ ] Generated resource displays clearly (questions + answer memo) and the **Print** button works (chrome hidden via `print:hidden`).
- [ ] Saving writes to `teacher_resources` with `teacher_id` = current teacher (degrades gracefully with a note if the table is absent).
- [ ] `/teacher/resources` lists **only the current teacher's** resources.
- [ ] `/teacher/resources/<owned-id>` → opens. `/teacher/resources/<other-teacher-or-bogus-id>` → not-found (never another teacher's data).

## 6. Admin
- [ ] `/admin`, `/admin/topics`, `/admin/questions`, `/admin/questions/new`, `/admin/questions/<id>/edit` → require the admin role.
- [ ] `/admin/topics` → topic catalogue lists (read-only).
- [ ] `/admin/questions` → question list with grade/topic/difficulty filters.
- [ ] Create question uses actual schema fields: `topic_id, grade, question_text, answer_text, hint, solution_steps, difficulty, marks, is_active`.
- [ ] Edit question saves; deactivating (`is_active = false`) hides it from learners without deleting.
- [ ] `/admin/questions/<invalid-id>/edit` → not-found (no crash).

## 7. Environment & security
- [ ] No `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` anywhere (project standardises on the anon key).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is read only in `src/lib/supabase/server.ts`; no `"use client"` file imports the server client.
- [ ] `ANTHROPIC_API_KEY` (optional) is read only in `src/lib/ai/` (generate-hint.ts, generate-solution.ts); with it set, a wrong practice answer gets a mistake-specific AI hint + tailored worked steps, and the diagnostic review persists AI hints (no learner identity sent); without it (or on API failure), seeded content appears. Marking is identical either way.
- [ ] No stray `console.log` / `TODO` / `.DS_Store` committed (`.DS_Store` is gitignored).
- [ ] Protected pages and server actions call `requireRole(...)`.
- [ ] `beta_leads`: public **insert** only, no public read. Parent routes read learner data **only** through the RLS-scoped session client (accepted links), never the service role.

### Database verification (SQL editor)
```sql
-- Seed counts (post clear-baseline seed)
select count(*) as topics from public.topics;                 -- expect 14
select grade, count(*) from public.questions group by grade;  -- expect 9 -> 54, 10 -> 54

-- No self-assigned admins from public sign-up (expect 0 unless provisioned on purpose)
select count(*) as admins from public.profiles where role = 'admin';

-- beta_leads accepts public inserts but not public reads
select tablename, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'beta_leads' order by cmd;

-- teacher_resources is owner-scoped (+ admin select)
select policyname, cmd, roles from pg_policies
where schemaname = 'public' and tablename = 'teacher_resources' order by cmd;

-- A beta lead was captured (after submitting the /beta form)
select full_name, email, role, selected_plan, created_at
from public.beta_leads order by created_at desc limit 5;
```

## Known limitations (non-blocking)
- **Parent linking has no secondary verification** — an invitation is addressed to a learner **email**; whoever controls that account can accept. Parents should double-check the address on their links list; removing the link revokes access instantly.
- **Answer checking is deterministic, same-form only** (exact tolerances: `x = 5` ↔ `5`, multi-root order — `or` / `,` / `;` / `/`-between-assignments, factor order with matching leading coefficient, exact fraction ↔ decimal, unicode superscripts, and guarded same-form symbolic rewrites such as term order `(2+x)` ↔ `(x+2)` via mathjs, server-side only). **Cross-form equivalence is deliberately rejected** — an expanded polynomial is not accepted for a factorised answer and an unsimplified fraction is not accepted for its simplified value, so "Factorise/Simplify" questions can't be gamed by echoing the question back. No AI marking, nothing approximate.
- **Diagnostic review reveals keys only after submission** — the per-question review (correct answers, hints, steps) lives solely in the persisted report, which exists only once grading completes; nothing ships to the client beforehand.
- **Best-effort persistence uses the service-role client** — safe only because it is always preceded by `requireRole(...)` and server-derived ownership.

## Beta blocker list
- [x] **Public sign-up could self-assign the `admin` role** (privilege escalation to question-bank CRUD). **Fixed** — admin removed from the sign-up form and rejected server-side (`PUBLIC_SIGNUP_ROLES` falls back to `student`).

## Non-blocking follow-ups
- [x] **Beta-form client validation** — name + email now use native `required` (with `aria-required`) for instant feedback; server validation remains authoritative. *(BetaLeadForm.tsx)*
- [x] **Quiz-submit concurrent-double-submit guard** — `QuizShell` uses a synchronous `useRef` guard so same-tick submits can't fire `onSubmit` twice. *(QuizShell.tsx)*
- [x] **Cross-request quiz-submit idempotency** — the client sends a stable `submissionKey` per attempt and the atomic `finalize_quiz_submission` function dedups on it, returning the existing report on a resubmit. *(QuizShell.tsx, src/lib/quiz/session.ts)*
- [~] **Automated tests — expanded.** Vitest unit suite (`pnpm test`), 220+ tests. Plus a gated **RLS integration suite** (`pnpm test:integration`, `tests/integration/`) that runs against a dedicated test Supabase project — see [TESTING_E2E_PLAN.md](TESTING_E2E_PLAN.md). *Remaining:* Phase 1b (attempts/reports/public-read), Playwright E2E, and CI (this manual checklist covers the browser journeys for now).
- [x] **Secure parent–learner linking** — built (`parent_learner_links` + RLS); parent report components now show real linked-learner data. *(supabase/migrations/20260705100000, /parent/reports, /learner)*
