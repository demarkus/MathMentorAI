-- Secure parent-learner linking.
--
-- Parents invite a learner by email; the learner explicitly accepts (or
-- rejects) the request from their dashboard. Only an ACCEPTED link grants the
-- parent read access to that learner's data — and nothing else changes: all
-- write paths stay exactly as they are.
--
-- Zero-trust shape:
--   * Parents may create/see/delete only their own links (role-checked insert,
--     like learner_profiles/teacher_resources).
--   * Column-level grants keep the client writable surface minimal: inserts may
--     set only (parent_id, learner_email) — status/learner_id take their
--     defaults — and updates may touch only (status, learner_id).
--   * Learners see only invitations addressed to their profile email, may only
--     move a link to 'accepted'/'rejected', and may only bind learner_id to
--     themselves (accepting REQUIRES the self-binding).
--   * Parent read access to learner_profiles / quiz_sessions / attempts /
--     reports is additive SELECT-only, gated on an accepted link.

create table public.parent_learner_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  learner_email text not null,
  learner_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  -- One link per (parent, learner email); re-inviting requires removing first.
  unique (parent_id, learner_email),
  -- Stored lowercase so the learner's profile-email match is exact.
  constraint parent_learner_links_email_ck check (
    char_length(learner_email) between 3 and 254
    and learner_email = lower(learner_email)
    and learner_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  )
);

-- Learner-side lookups (dashboard invitations + policy subqueries).
create index parent_learner_links_learner_email_idx on public.parent_learner_links (learner_email);
create index parent_learner_links_learner_id_idx on public.parent_learner_links (learner_id) where learner_id is not null;
-- Parent-side lookups are covered by the unique (parent_id, learner_email) index.

alter table public.parent_learner_links enable row level security;

-- Column-scoped grants (see header). SELECT stays row-scoped by the policies.
grant select on public.parent_learner_links to authenticated;
grant insert (parent_id, learner_email) on public.parent_learner_links to authenticated;
grant update (status, learner_id) on public.parent_learner_links to authenticated;
grant delete on public.parent_learner_links to authenticated;

-- Parents: own links only; creating one requires actually holding the parent role.
create policy "parent_learner_links_select_parent" on public.parent_learner_links for select to authenticated
  using ((select auth.uid()) = parent_id);
create policy "parent_learner_links_insert_parent" on public.parent_learner_links for insert to authenticated
  with check (
    (select auth.uid()) = parent_id
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'parent')
  );
create policy "parent_learner_links_delete_parent" on public.parent_learner_links for delete to authenticated
  using ((select auth.uid()) = parent_id);

-- Learners: links addressed to their profile email.
create policy "parent_learner_links_select_learner" on public.parent_learner_links for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(p.email) = learner_email)
  );
-- Responding: the new state must be a decision (never back to 'pending') and
-- learner_id may only ever bind to the responder. Accepting requires the
-- self-binding, so a parent can never end up linked to a different account.
create policy "parent_learner_links_update_learner" on public.parent_learner_links for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(p.email) = learner_email)
  )
  with check (
    exists (select 1 from public.profiles p where p.id = (select auth.uid()) and lower(p.email) = learner_email)
    and status in ('accepted', 'rejected')
    and (learner_id is null or learner_id = (select auth.uid()))
    and (status <> 'accepted' or learner_id = (select auth.uid()))
  );

-- Parent read access to learner data, gated on an ACCEPTED link. Additive
-- (permissive) SELECT-only policies: learner/owner access is unchanged and no
-- write access is introduced anywhere.
create policy "learner_profiles_select_linked_parent" on public.learner_profiles for select to authenticated
  using (
    exists (
      select 1 from public.parent_learner_links pll
      where pll.parent_id = (select auth.uid())
        and pll.status = 'accepted'
        and pll.learner_id = learner_profiles.user_id
    )
  );

create policy "quiz_sessions_select_linked_parent" on public.quiz_sessions for select to authenticated
  using (
    exists (
      select 1
      from public.parent_learner_links pll
      join public.learner_profiles lp on lp.user_id = pll.learner_id
      where pll.parent_id = (select auth.uid())
        and pll.status = 'accepted'
        and lp.id = quiz_sessions.learner_id
    )
  );

create policy "attempts_select_linked_parent" on public.attempts for select to authenticated
  using (
    exists (
      select 1
      from public.parent_learner_links pll
      join public.learner_profiles lp on lp.user_id = pll.learner_id
      where pll.parent_id = (select auth.uid())
        and pll.status = 'accepted'
        and lp.id = attempts.learner_id
    )
  );

create policy "reports_select_linked_parent" on public.reports for select to authenticated
  using (
    exists (
      select 1
      from public.parent_learner_links pll
      join public.learner_profiles lp on lp.user_id = pll.learner_id
      where pll.parent_id = (select auth.uid())
        and pll.status = 'accepted'
        and lp.id = reports.learner_id
    )
  );
