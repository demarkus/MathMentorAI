-- Phase A — secure role assignment.
--
-- Fixes the privilege-escalation path where an authenticated user could set
-- their own profiles.role to 'admin' via the Data API, and replaces onboarding's
-- unchecked service-role upsert with a trusted, atomic, allow-listed function.
--
-- Additive and idempotent. Runs after the initial schema migration.

-- 1. Narrow authenticated UPDATE on profiles to the full_name column only. ------
--    The own-row RLS policy (profiles_update_own) still applies; this removes the
--    ability to change role or email through the Data API. Legitimate role writes
--    happen only via the service role (sign-up) or the trusted function below.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 2. Trusted onboarding: set role + provision the learner profile atomically. ---
--    - Only public onboarding roles are allowed (admin is provisioned out-of-band).
--    - The role is set only when it is not already set, so an existing user cannot
--      revisit onboarding to switch roles.
--    - security definer + empty search_path + fully-qualified names; EXECUTE is
--      revoked from PUBLIC/anon and granted only to authenticated.
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
    update public.profiles
      set role = p_role::public.user_role, updated_at = now()
      where id = v_uid;
  elsif v_current::text <> p_role then
    -- Role already chosen at sign-up; onboarding may not change it.
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
