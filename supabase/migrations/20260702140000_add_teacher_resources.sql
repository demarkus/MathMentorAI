-- Adds teacher_resources to persist generated worksheets/tests/memos/revision packs.
--
-- Additive and idempotent. It does not alter any existing table and is safe to
-- re-run (guards on table, indexes, and policies). Column shapes match the
-- insert performed by src/app/teacher/generator/actions.ts (saveResource), so
-- saving/listing/detail begin working once applied with no application change.
--
-- Access model:
--   * A teacher may select/insert/update/delete only their own resources.
--   * An admin may select every teacher's resources (role read from profiles).

create table if not exists public.teacher_resources (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  grade integer not null check (grade in (9, 10)),
  topic_id uuid references public.topics(id) on delete set null,
  resource_type text not null check (resource_type in ('worksheet', 'test', 'memo', 'revision_pack')),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists teacher_resources_teacher_id_idx
  on public.teacher_resources (teacher_id);
create index if not exists teacher_resources_topic_id_idx
  on public.teacher_resources (topic_id);
create index if not exists teacher_resources_created_at_idx
  on public.teacher_resources (created_at desc);

alter table public.teacher_resources enable row level security;

grant select, insert, update, delete on public.teacher_resources to authenticated;

-- A teacher can only read their own resources.
drop policy if exists "teacher_resources_select_own" on public.teacher_resources;
create policy "teacher_resources_select_own" on public.teacher_resources for select to authenticated
  using ((select auth.uid()) = teacher_id);

-- A teacher can only create resources owned by themselves.
drop policy if exists "teacher_resources_insert_own" on public.teacher_resources;
create policy "teacher_resources_insert_own" on public.teacher_resources for insert to authenticated
  with check ((select auth.uid()) = teacher_id);

-- A teacher can only update their own resources (and cannot reassign ownership).
drop policy if exists "teacher_resources_update_own" on public.teacher_resources;
create policy "teacher_resources_update_own" on public.teacher_resources for update to authenticated
  using ((select auth.uid()) = teacher_id)
  with check ((select auth.uid()) = teacher_id);

-- A teacher can only delete their own resources.
drop policy if exists "teacher_resources_delete_own" on public.teacher_resources;
create policy "teacher_resources_delete_own" on public.teacher_resources for delete to authenticated
  using ((select auth.uid()) = teacher_id);

-- An admin can read every teacher's resources.
drop policy if exists "teacher_resources_select_admin" on public.teacher_resources;
create policy "teacher_resources_select_admin" on public.teacher_resources for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));
