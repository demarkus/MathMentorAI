-- Tighten RLS so creating an owned row also requires the matching profile role.
--
-- Before: learner_profiles and teacher_resources insert policies checked only
-- ownership (auth.uid() = user_id / teacher_id). That let ANY authenticated
-- account create an owned learner profile, and any account create a
-- "teacher" resource, regardless of their actual role — permissions that did
-- not reflect the documented role model.
--
-- The legitimate write paths are unaffected because they run with the service
-- role (which bypasses RLS): onboarding creates the learner row via the
-- SECURITY DEFINER complete_onboarding() function, and the teacher generator
-- saves resources with the service-role client after requireRole('teacher').
-- These policies therefore only govern direct Data API writes.
--
-- The role subquery mirrors the existing admin policy pattern (a user can always
-- read their own profiles row via profiles_select_own). Additive and idempotent.

-- learner_profiles: only a 'student' may create their own learner row.
drop policy if exists "learner_profiles_insert_own" on public.learner_profiles;
create policy "learner_profiles_insert_own" on public.learner_profiles for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'student'
    )
  );

-- teacher_resources: only a 'teacher' may create resources they own.
drop policy if exists "teacher_resources_insert_own" on public.teacher_resources;
create policy "teacher_resources_insert_own" on public.teacher_resources for insert to authenticated
  with check (
    (select auth.uid()) = teacher_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'teacher'
    )
  );

-- teacher_resources: only a 'teacher' may update resources they own (ownership
-- still required and cannot be reassigned).
drop policy if exists "teacher_resources_update_own" on public.teacher_resources;
create policy "teacher_resources_update_own" on public.teacher_resources for update to authenticated
  using ((select auth.uid()) = teacher_id)
  with check (
    (select auth.uid()) = teacher_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'teacher'
    )
  );

-- Note: the admin SELECT-all policy on teacher_resources is intentionally left
-- unchanged (administrator read access preserved).
