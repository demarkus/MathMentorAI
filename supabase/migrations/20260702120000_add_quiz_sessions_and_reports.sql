-- Adds quiz_sessions and reports tables to back the diagnostic quiz engine.
--
-- This is an additive migration. It does not alter any existing table and is
-- safe to re-run (guards on types, tables, indexes, and policies).
--
-- Column shapes intentionally match the inserts performed by
-- src/app/learner/diagnostic/actions.ts (persistSessionAndReport), so the
-- diagnostic begins persisting sessions and reports with no application change.

-- Enums (guarded so re-running the migration does not error) --------------------

do $$
begin
  create type public.quiz_type as enum ('diagnostic', 'practice');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.report_type as enum ('diagnostic', 'practice', 'progress');
exception
  when duplicate_object then null;
end
$$;

-- Tables -------------------------------------------------------------------------

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(id) on delete cascade,
  quiz_type public.quiz_type not null default 'diagnostic',
  score numeric not null default 0 check (score >= 0),
  total_marks numeric not null default 0 check (total_marks >= 0),
  percentage integer not null default 0 check (percentage between 0 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(id) on delete cascade,
  quiz_session_id uuid references public.quiz_sessions(id) on delete set null,
  report_type public.report_type not null default 'diagnostic',
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists quiz_sessions_learner_created_idx
  on public.quiz_sessions (learner_id, created_at desc);
create index if not exists reports_learner_created_idx
  on public.reports (learner_id, created_at desc);

-- Row Level Security -------------------------------------------------------------

alter table public.quiz_sessions enable row level security;
alter table public.reports enable row level security;

grant select, insert on public.quiz_sessions to authenticated;
grant select, insert on public.reports to authenticated;

-- Learners can read and create their own quiz sessions.
drop policy if exists "quiz_sessions_select_own" on public.quiz_sessions;
create policy "quiz_sessions_select_own" on public.quiz_sessions for select to authenticated
  using (exists (
    select 1 from public.learner_profiles lp
    where lp.id = learner_id and lp.user_id = (select auth.uid())
  ));

drop policy if exists "quiz_sessions_insert_own" on public.quiz_sessions;
create policy "quiz_sessions_insert_own" on public.quiz_sessions for insert to authenticated
  with check (exists (
    select 1 from public.learner_profiles lp
    where lp.id = learner_id and lp.user_id = (select auth.uid())
  ));

-- Learners can read and create their own reports.
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select to authenticated
  using (exists (
    select 1 from public.learner_profiles lp
    where lp.id = learner_id and lp.user_id = (select auth.uid())
  ));

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert to authenticated
  with check (exists (
    select 1 from public.learner_profiles lp
    where lp.id = learner_id and lp.user_id = (select auth.uid())
  ));
