-- Adds beta_leads to capture pricing/beta sign-up submissions.
--
-- Additive and idempotent. It does not alter any existing table and is safe to
-- re-run (guards on table, indexes, and policies). Column shapes match the
-- insert performed by src/app/beta/actions.ts (submitBetaLead).
--
-- Access model:
--   * Anyone (anon or authenticated) may insert a lead — this is a public form.
--   * Only an admin may read leads (role read from profiles).
--   * No public select/update/delete.

create table if not exists public.beta_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('learner', 'parent', 'teacher', 'tutor', 'school_admin')),
  selected_plan text not null,
  message text,
  created_at timestamptz not null default now()
);

create index if not exists beta_leads_email_idx on public.beta_leads (email);
create index if not exists beta_leads_role_idx on public.beta_leads (role);
create index if not exists beta_leads_created_at_idx on public.beta_leads (created_at desc);

alter table public.beta_leads enable row level security;

grant insert on public.beta_leads to anon, authenticated;
grant select on public.beta_leads to authenticated;

-- Anyone can submit a lead (public form). No row is readable back to them.
drop policy if exists "beta_leads_insert_public" on public.beta_leads;
create policy "beta_leads_insert_public" on public.beta_leads for insert to anon, authenticated
  with check (true);

-- Only an admin can read leads.
drop policy if exists "beta_leads_select_admin" on public.beta_leads;
create policy "beta_leads_select_admin" on public.beta_leads for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  ));
