-- Parts B + D — trusted, issued-bound, idempotent, atomic quiz submission.
--
-- - Learners may no longer INSERT attempts / quiz_sessions / reports directly.
-- - A session persists its issued question set at start (question_ids).
-- - finalize_quiz_submission writes attempts + report + session status in one
--   transaction, is idempotent (re-finalizing returns the existing report), and
--   is callable ONLY by service_role (the server holds the key; clients cannot
--   call it and cannot forge results).
--
-- Additive and idempotent.

-- 1. Issued-session columns ------------------------------------------------------
alter table public.quiz_sessions
  add column if not exists status text check (status in ('issued', 'submitted')),
  add column if not exists topic_id uuid references public.topics(id) on delete set null,
  add column if not exists grade integer check (grade in (9, 10)),
  add column if not exists question_ids uuid[],
  add column if not exists submission_key uuid;

-- One finalization per idempotency key.
create unique index if not exists quiz_sessions_submission_key_key
  on public.quiz_sessions (submission_key)
  where submission_key is not null;

-- 2. Revoke direct client writes to the assessment tables ------------------------
--    SELECT remains (learners read their own rows under RLS); writes now go only
--    through the trusted server (service role) / the finalize function.
revoke insert on public.attempts from authenticated;
revoke insert on public.quiz_sessions from authenticated;
revoke insert on public.reports from authenticated;

-- 3. Trusted, atomic, idempotent finalize ---------------------------------------
create or replace function public.finalize_quiz_submission(
  p_session_id uuid,
  p_learner_id uuid,
  p_submission_key uuid,
  p_score numeric,
  p_total_marks numeric,
  p_percentage integer,
  p_report_type public.report_type,
  p_report_data jsonb,
  p_attempts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_owner uuid;
  v_report_id uuid;
  v_attempt jsonb;
begin
  select status, learner_id into v_status, v_owner
    from public.quiz_sessions
    where id = p_session_id
    for update;

  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if v_owner is distinct from p_learner_id then
    raise exception 'session does not belong to learner' using errcode = '42501';
  end if;

  -- Idempotent: a session is finalized once; a retry returns the existing report.
  if v_status = 'submitted' then
    select id into v_report_id
      from public.reports
      where quiz_session_id = p_session_id
      order by created_at
      limit 1;
    return v_report_id;
  end if;

  for v_attempt in select * from jsonb_array_elements(p_attempts) loop
    insert into public.attempts (learner_id, question_id, submitted_answer, is_correct, score, quiz_session_id)
    values (
      p_learner_id,
      (v_attempt ->> 'questionId')::uuid,
      coalesce(v_attempt ->> 'submitted', ''),
      (v_attempt ->> 'isCorrect')::boolean,
      coalesce((v_attempt ->> 'score')::numeric, 0),
      p_session_id
    );
  end loop;

  insert into public.reports (learner_id, quiz_session_id, report_type, data)
  values (p_learner_id, p_session_id, p_report_type, p_report_data)
  returning id into v_report_id;

  update public.quiz_sessions
    set status = 'submitted',
        score = p_score,
        total_marks = p_total_marks,
        percentage = p_percentage,
        submission_key = p_submission_key
    where id = p_session_id;

  return v_report_id;
end;
$$;

revoke all on function public.finalize_quiz_submission(
  uuid, uuid, uuid, numeric, numeric, integer, public.report_type, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.finalize_quiz_submission(
  uuid, uuid, uuid, numeric, numeric, integer, public.report_type, jsonb, jsonb
) to service_role;
