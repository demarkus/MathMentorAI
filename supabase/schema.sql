-- Math Mentor AI — reference schema (SCHEMA ONLY, no seed data).
--
-- This is a consolidated, human-readable reference of the objects created by the
-- migrations in supabase/migrations/ (their cumulative final state). It is NOT a
-- setup path — always set up a database from the migrations (in filename order).
-- Seed content lives only in supabase/seed.sql.
--
-- Security posture reflected here:
--   * profiles.role is not client-updatable (only full_name is); onboarding goes
--     through complete_onboarding().
--   * questions answer keys (answer_text, hint, solution_steps) are not granted
--     to anon/authenticated; only render columns are.
--   * attempts / quiz_sessions / reports are not client-insertable; writes go
--     through finalize_quiz_submission() (service_role only).

create extension if not exists pgcrypto;

-- Enums --------------------------------------------------------------------------
create type public.user_role as enum ('student', 'parent', 'teacher', 'admin');
create type public.question_difficulty as enum ('easy', 'medium', 'hard');
create type public.quiz_type as enum ('diagnostic', 'practice');
create type public.report_type as enum ('diagnostic', 'practice', 'progress');

-- Tables -------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role public.user_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  grade integer not null check (grade in (9, 10)),
  school_name text,
  target_score integer check (target_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  grade integer not null check (grade in (9, 10)),
  name text not null,
  slug text not null,
  description text not null,
  curriculum_tag text not null default 'CAPS',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (grade, slug),
  -- Composite-FK target: lets questions bind (topic_id, grade) to a topic's grade.
  constraint topics_id_grade_key unique (id, grade)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  grade integer not null check (grade in (9, 10)),
  question_text text not null,
  answer_text text not null,
  hint text not null,
  solution_steps jsonb not null check (jsonb_typeof(solution_steps) = 'array'),
  difficulty public.question_difficulty not null default 'medium',
  cognitive_level text not null default 'routine procedure',
  marks integer not null default 1 check (marks > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  -- A question's grade must match its topic's grade (enforced declaratively).
  constraint questions_topic_grade_fk foreign key (topic_id, grade)
    references public.topics (id, grade) on delete cascade
);

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(id) on delete cascade,
  quiz_type public.quiz_type not null default 'diagnostic',
  score numeric not null default 0 check (score >= 0),
  total_marks numeric not null default 0 check (total_marks >= 0),
  percentage integer not null default 0 check (percentage between 0 and 100),
  created_at timestamptz not null default now(),
  -- Issued-session fields (persist the exact question set + idempotency).
  status text check (status in ('issued', 'submitted')),
  topic_id uuid references public.topics(id) on delete set null,
  grade integer check (grade in (9, 10)),
  question_ids uuid[],
  submission_key uuid
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  submitted_answer text not null,
  is_correct boolean not null,
  score numeric not null default 0 check (score >= 0),
  time_spent_seconds integer check (time_spent_seconds >= 0),
  quiz_session_id uuid references public.quiz_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(id) on delete cascade,
  quiz_session_id uuid references public.quiz_sessions(id) on delete set null,
  report_type public.report_type not null default 'diagnostic',
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now()
);

create table public.teacher_resources (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  grade integer not null check (grade in (9, 10)),
  topic_id uuid references public.topics(id) on delete set null,
  resource_type text not null check (resource_type in ('worksheet', 'test', 'memo', 'revision_pack')),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

create table public.beta_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('learner', 'parent', 'teacher', 'tutor', 'school_admin')),
  selected_plan text not null,
  message text,
  created_at timestamptz not null default now()
);

-- Indexes ------------------------------------------------------------------------
create index attempts_learner_created_idx on public.attempts (learner_id, created_at desc);
create index attempts_quiz_session_idx on public.attempts (quiz_session_id);
create index questions_topic_active_idx on public.questions (topic_id, is_active);
create index quiz_sessions_learner_created_idx on public.quiz_sessions (learner_id, created_at desc);
create unique index quiz_sessions_submission_key_key
  on public.quiz_sessions (submission_key) where submission_key is not null;
create index reports_learner_created_idx on public.reports (learner_id, created_at desc);
create index teacher_resources_teacher_id_idx on public.teacher_resources (teacher_id);
create index teacher_resources_topic_id_idx on public.teacher_resources (topic_id);
create index teacher_resources_created_at_idx on public.teacher_resources (created_at desc);
create index beta_leads_email_idx on public.beta_leads (email);
create index beta_leads_role_idx on public.beta_leads (role);
create index beta_leads_created_at_idx on public.beta_leads (created_at desc);

-- Row Level Security -------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.reports enable row level security;
alter table public.teacher_resources enable row level security;
alter table public.beta_leads enable row level security;

-- Grants -------------------------------------------------------------------------
-- profiles: role/email are NOT client-updatable; only full_name is.
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

grant select, insert, update on public.learner_profiles to authenticated;

grant select on public.topics to anon, authenticated;

-- questions: answer keys are withheld; only render columns are selectable.
grant select (id, topic_id, grade, question_text, difficulty, cognitive_level, marks, is_active, created_at)
  on public.questions to anon, authenticated;

-- Assessment tables: SELECT only. Inserts are revoked; writes go through
-- finalize_quiz_submission() (service_role). The historical *_insert_own policies
-- below remain but are inert without the INSERT grant.
grant select on public.attempts to authenticated;
grant select on public.quiz_sessions to authenticated;
grant select on public.reports to authenticated;

grant select, insert, update, delete on public.teacher_resources to authenticated;

grant insert on public.beta_leads to anon, authenticated;
grant select on public.beta_leads to authenticated;

-- Policies -----------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "learner_profiles_select_own" on public.learner_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "learner_profiles_insert_own" on public.learner_profiles for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'student')
  );
create policy "learner_profiles_update_own" on public.learner_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "topics_readable" on public.topics for select to anon, authenticated using (true);
create policy "active_questions_readable" on public.questions for select to anon, authenticated using (is_active);

create policy "quiz_sessions_select_own" on public.quiz_sessions for select to authenticated
  using (exists (select 1 from public.learner_profiles lp where lp.id = learner_id and lp.user_id = (select auth.uid())));
create policy "quiz_sessions_insert_own" on public.quiz_sessions for insert to authenticated
  with check (exists (select 1 from public.learner_profiles lp where lp.id = learner_id and lp.user_id = (select auth.uid())));

create policy "attempts_select_own" on public.attempts for select to authenticated
  using (exists (select 1 from public.learner_profiles lp where lp.id = learner_id and lp.user_id = (select auth.uid())));
create policy "attempts_insert_own" on public.attempts for insert to authenticated
  with check (exists (select 1 from public.learner_profiles lp where lp.id = learner_id and lp.user_id = (select auth.uid())));

create policy "reports_select_own" on public.reports for select to authenticated
  using (exists (select 1 from public.learner_profiles lp where lp.id = learner_id and lp.user_id = (select auth.uid())));
create policy "reports_insert_own" on public.reports for insert to authenticated
  with check (exists (select 1 from public.learner_profiles lp where lp.id = learner_id and lp.user_id = (select auth.uid())));

create policy "teacher_resources_select_own" on public.teacher_resources for select to authenticated
  using ((select auth.uid()) = teacher_id);
create policy "teacher_resources_insert_own" on public.teacher_resources for insert to authenticated
  with check (
    (select auth.uid()) = teacher_id
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher')
  );
create policy "teacher_resources_update_own" on public.teacher_resources for update to authenticated
  using ((select auth.uid()) = teacher_id)
  with check (
    (select auth.uid()) = teacher_id
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher')
  );
create policy "teacher_resources_delete_own" on public.teacher_resources for delete to authenticated
  using ((select auth.uid()) = teacher_id);
create policy "teacher_resources_select_admin" on public.teacher_resources for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create policy "beta_leads_insert_public" on public.beta_leads for insert to anon, authenticated
  with check (true);
create policy "beta_leads_select_admin" on public.beta_leads for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Functions & triggers -----------------------------------------------------------
-- Provisions a profile row when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trusted onboarding: allow-listed role, set only when unset, atomic learner row.
create or replace function public.complete_onboarding(p_role text, p_grade integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_current public.user_role;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if p_role not in ('student', 'parent', 'teacher') then
    raise exception 'invalid onboarding role: %', p_role using errcode = '22023';
  end if;
  if p_role = 'student' and (p_grade is null or p_grade not in (9, 10)) then
    raise exception 'invalid grade: %', p_grade using errcode = '22023';
  end if;

  select role into v_current from public.profiles where id = v_uid;
  if v_current is null then
    update public.profiles set role = p_role::public.user_role, updated_at = now() where id = v_uid;
  elsif v_current::text <> p_role then
    raise exception 'role already set' using errcode = '42501';
  end if;

  if p_role = 'student' then
    insert into public.learner_profiles (user_id, grade)
    values (v_uid, p_grade)
    on conflict (user_id) do update set grade = excluded.grade;
  end if;
end;
$$;
revoke all on function public.complete_onboarding(text, integer) from public, anon;
grant execute on function public.complete_onboarding(text, integer) to authenticated;

-- Trusted submission: atomic, idempotent, owner-checked. service_role only.
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
    from public.quiz_sessions where id = p_session_id for update;
  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if v_owner is distinct from p_learner_id then
    raise exception 'session does not belong to learner' using errcode = '42501';
  end if;

  if v_status = 'submitted' then
    select id into v_report_id from public.reports
      where quiz_session_id = p_session_id order by created_at limit 1;
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
    set status = 'submitted', score = p_score, total_marks = p_total_marks,
        percentage = p_percentage, submission_key = p_submission_key
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
