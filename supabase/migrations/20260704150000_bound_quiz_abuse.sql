-- Objective 5: bound quiz abuse and storage.
--
--   * cap the stored answer length (backstop for the client maxLength and the
--     Server Action check) so an oversized answer can never be persisted;
--   * index the learner's active issued sessions to support the reuse/cap lookup
--     that stops unbounded simultaneously-issued sessions per learner.
--
-- New migration; earlier migrations untouched. Apply once.

-- 1. Answer length cap. NOT VALID so any legacy rows are left as-is while new
--    rows (all written via finalize_quiz_submission) are bounded. Keep this in
--    sync with MAX_ANSWER_LENGTH in src/lib/quiz/limits.ts.
alter table public.attempts drop constraint if exists attempts_answer_len_ck;
alter table public.attempts add constraint attempts_answer_len_ck
  check (char_length(submitted_answer) <= 500) not valid;

-- 2. Partial index over a learner's currently-issued sessions. Supports the
--    reuse (same type/topic/grade) and active-session-cap lookups in startSession
--    without scanning submitted history.
create index if not exists quiz_sessions_learner_issued_idx
  on public.quiz_sessions (learner_id, quiz_type, topic_id, grade)
  where status = 'issued';
