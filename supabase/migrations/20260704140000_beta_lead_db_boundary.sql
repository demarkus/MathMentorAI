-- Objective 4: finish beta-lead hardening at the database boundary.
--
-- Fixes three defects in submit_beta_lead():
--   * it accepted arbitrary plan ids   -> enforce the canonical allow-list from
--     src/lib/marketing/plans.ts inside Postgres (return 'invalid_plan');
--   * it trusted a caller-supplied IP  -> the RPC is now service-role-only and is
--     invoked from the validated Server Action with a server-derived IP, so an
--     anonymous Data API caller can no longer reach it (or spoof p_ip) directly;
--   * dedup + rate-limit were check-then-insert races -> dedup is now a unique
--     index with ON CONFLICT DO NOTHING, and the rate-limit count + dedup insert
--     run under per-email (then per-IP) transaction advisory locks, so concurrent
--     duplicate or burst submissions resolve cleanly (no 500s, no over-limit slips).
--
-- Admin-only reads are unchanged. New migration; earlier migrations untouched.
-- Apply once (not intended to be replayed).

-- 1. Canonical plan allow-list (mirror of src/lib/marketing/plans.ts). Defense in
--    depth alongside the in-function check. NOT VALID so any legacy rows are left
--    as-is while new rows are constrained.
alter table public.beta_leads drop constraint if exists beta_leads_plan_ck;
alter table public.beta_leads add constraint beta_leads_plan_ck check (
  selected_plan in ('parent-beta', 'learner-monthly', 'teacher-basic', 'teacher-pro', 'tutor-centre')
) not valid;

-- 2. Concurrency-safe duplicate prevention: one lead per (email, plan). Remove any
--    pre-existing duplicates (keep the earliest) before enforcing uniqueness.
delete from public.beta_leads a
  using public.beta_leads b
  where a.email = b.email
    and a.selected_plan = b.selected_plan
    and (a.created_at, a.id) > (b.created_at, b.id);
create unique index if not exists beta_leads_email_plan_uq
  on public.beta_leads (email, selected_plan);

-- 3. Rebuild the trusted submit path with the allow-list, advisory-locked rate
--    limiting, and on-conflict dedup.
create or replace function public.submit_beta_lead(
  p_full_name text,
  p_email text,
  p_role text,
  p_selected_plan text,
  p_phone text,
  p_message text,
  p_ip text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := trim(p_full_name);
  v_email text := lower(trim(p_email));
  v_phone text := nullif(trim(p_phone), '');
  v_message text := nullif(trim(p_message), '');
  v_plan text := trim(p_selected_plan);
  v_ip inet;
  v_recent integer;
  v_inserted integer;
begin
  -- Parse the IP defensively; a malformed value is simply dropped.
  begin
    v_ip := nullif(trim(p_ip), '')::inet;
  exception when others then
    v_ip := null;
  end;

  -- Required + shape/length validation.
  if v_name = '' or char_length(v_name) > 120 then
    raise exception 'invalid name' using errcode = '22023';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if p_role not in ('learner', 'parent', 'teacher', 'tutor', 'school_admin') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  if v_phone is not null and char_length(v_phone) > 40 then
    raise exception 'invalid phone' using errcode = '22023';
  end if;
  if v_message is not null and char_length(v_message) > 2000 then
    raise exception 'invalid message' using errcode = '22023';
  end if;

  -- Canonical plan allow-list (must match src/lib/marketing/plans.ts). An unknown
  -- plan id is rejected here regardless of what the caller claims.
  if v_plan not in ('parent-beta', 'learner-monthly', 'teacher-basic', 'teacher-pro', 'tutor-centre') then
    return 'invalid_plan';
  end if;

  -- Serialize same-email (then same-IP) submissions so the rate-limit count and
  -- the dedup insert are atomic against concurrent callers. Consistent lock order
  -- (email before IP) avoids deadlocks. Locks release at transaction end.
  perform pg_advisory_xact_lock(hashtext('beta_lead_email:' || v_email));
  if v_ip is not null then
    perform pg_advisory_xact_lock(hashtext('beta_lead_ip:' || host(v_ip)));
  end if;

  -- Rate limit: at most 5 submissions in 10 minutes per email or per IP. Atomic
  -- now that same-email/same-IP callers are serialized by the locks above.
  select count(*) into v_recent
    from public.beta_leads
    where created_at > now() - interval '10 minutes'
      and (email = v_email or (v_ip is not null and ip = v_ip));
  if v_recent >= 5 then
    return 'rate_limited';
  end if;

  -- Concurrency-safe dedup: one lead per (email, plan). A racing duplicate hits
  -- the unique index and is turned into a clean 'duplicate' (never a 500).
  insert into public.beta_leads (full_name, email, phone, role, selected_plan, message, ip)
  values (v_name, v_email, v_phone, p_role, v_plan, v_message, v_ip)
  on conflict (email, selected_plan) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return 'duplicate';
  end if;

  return 'ok';
end;
$$;

-- 4. Service-role-only. An anonymous Data API caller can no longer invoke the RPC
--    (nor supply a p_ip); the validated Server Action calls it via the service
--    role with a server-derived IP.
revoke all on function public.submit_beta_lead(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_beta_lead(text, text, text, text, text, text, text)
  to service_role;
