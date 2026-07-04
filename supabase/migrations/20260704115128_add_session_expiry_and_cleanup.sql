-- Issued-session lifecycle: expiry + indexes + a cleanup path for abandoned rows.
--
-- Sessions are created when a learner explicitly starts a diagnostic/practice
-- run (an issued row with its persisted question set). Some are never submitted
-- (the learner navigates away). This adds a bounded lifetime and a way to reclaim
-- the abandoned rows without touching submitted history.
--
-- Additive and idempotent.

-- 1. Expiry -----------------------------------------------------------------------
-- A safety-net default (2 hours) is set at the DB level; the app also sets it
-- explicitly at start so the value is testable and adjustable per quiz type.
alter table public.quiz_sessions
  add column if not exists expires_at timestamptz not null default (now() + interval '2 hours');

-- 2. Indexes ----------------------------------------------------------------------
-- Owner + status: "does this learner have an open issued session" and dashboards.
create index if not exists quiz_sessions_learner_status_idx
  on public.quiz_sessions (learner_id, status);
-- Cleanup scan: find expired, still-issued rows cheaply.
create index if not exists quiz_sessions_status_expires_idx
  on public.quiz_sessions (status, expires_at);

-- 3. Cleanup of abandoned issued sessions ----------------------------------------
-- Deletes ONLY issued (never-submitted) rows past their expiry. Submitted
-- sessions — and the attempts/reports that reference them — are never touched.
-- Returns the number of rows removed. service_role only.
--
-- Run on a schedule (e.g. Supabase scheduled function / pg_cron):
--   select public.cleanup_expired_sessions();
create or replace function public.cleanup_expired_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.quiz_sessions
    where status is distinct from 'submitted'
      and expires_at < now();
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.cleanup_expired_sessions() from public, anon, authenticated;
grant execute on function public.cleanup_expired_sessions() to service_role;
