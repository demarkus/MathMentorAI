-- Links attempts to the quiz session they belong to.
--
-- Additive and idempotent. Must run after 20260702120000_add_quiz_sessions_and_reports.sql
-- (it references public.quiz_sessions). Existing attempts rows keep a null
-- quiz_session_id, and the column is nullable so practice attempts that are not
-- tied to a session remain valid.

alter table public.attempts
  add column if not exists quiz_session_id uuid references public.quiz_sessions(id) on delete set null;

create index if not exists attempts_quiz_session_idx
  on public.attempts (quiz_session_id);
