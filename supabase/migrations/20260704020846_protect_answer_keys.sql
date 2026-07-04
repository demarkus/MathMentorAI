-- Part C — protect answer keys.
--
-- answer_text, hint, and solution_steps must not be readable through the public
-- Data API (they were exposed to anon + authenticated via the table-wide SELECT
-- grant). Narrow the SELECT grant on public.questions to render-only columns.
--
-- The active_questions_readable RLS policy still restricts rows to is_active.
-- Trusted server code reads the answer columns via the service role (which
-- bypasses grants), so grading, worksheet memos, and the practice check still
-- work. Admin management already uses the service role.
--
-- Additive and idempotent.

revoke select on public.questions from anon, authenticated;

grant select (
  id,
  topic_id,
  grade,
  question_text,
  difficulty,
  cognitive_level,
  marks,
  is_active,
  created_at
) on public.questions to anon, authenticated;
