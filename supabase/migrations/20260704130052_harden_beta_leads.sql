-- Harden the public beta-lead form: length caps, duplicate suppression, and
-- rate limiting — all enforced server-side so the public endpoint can't be used
-- to flood the table or store oversized payloads.
--
-- All writes now go through submit_beta_lead() (SECURITY DEFINER, anon-callable).
-- Direct INSERT is revoked, so the anti-abuse checks cannot be bypassed. Leads
-- remain admin-only readable (unchanged select policy).
--
-- Additive and idempotent.

-- 1. Length caps (defense in depth; the function validates too). NOT VALID so
--    the constraint governs new rows without retro-failing on any legacy data.
alter table public.beta_leads drop constraint if exists beta_leads_len_ck;
alter table public.beta_leads add constraint beta_leads_len_ck check (
  char_length(full_name) between 1 and 120
  and char_length(email) between 3 and 254
  and (phone is null or char_length(phone) <= 40)
  and char_length(selected_plan) between 1 and 64
  and (message is null or char_length(message) <= 2000)
) not valid;

-- 2. Client IP for abuse review + rate limiting (admin-only via existing select).
alter table public.beta_leads add column if not exists ip inet;

-- 3. Close direct inserts — the function is the only write path.
revoke insert on public.beta_leads from anon, authenticated;
drop policy if exists "beta_leads_insert_public" on public.beta_leads;

-- 4. Trusted submit path: validate + rate-limit + dedupe. Definer, anon-callable.
--    Returns 'ok' (new), 'duplicate' (same email+plan already present), or
--    'rate_limited'. Raises on invalid input.
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
  if char_length(v_plan) < 1 or char_length(v_plan) > 64 then
    raise exception 'invalid plan' using errcode = '22023';
  end if;
  if v_phone is not null and char_length(v_phone) > 40 then
    raise exception 'invalid phone' using errcode = '22023';
  end if;
  if v_message is not null and char_length(v_message) > 2000 then
    raise exception 'invalid message' using errcode = '22023';
  end if;

  -- Rate limit: at most 5 submissions in 10 minutes per email or per IP.
  select count(*) into v_recent
    from public.beta_leads
    where created_at > now() - interval '10 minutes'
      and (email = v_email or (v_ip is not null and ip = v_ip));
  if v_recent >= 5 then
    return 'rate_limited';
  end if;

  -- Duplicate suppression: one lead per (email, plan). Idempotent for the user.
  if exists (
    select 1 from public.beta_leads where email = v_email and selected_plan = v_plan
  ) then
    return 'duplicate';
  end if;

  insert into public.beta_leads (full_name, email, phone, role, selected_plan, message, ip)
  values (v_name, v_email, v_phone, p_role, v_plan, v_message, v_ip);

  return 'ok';
end;
$$;

revoke all on function public.submit_beta_lead(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_beta_lead(text, text, text, text, text, text, text)
  to anon, authenticated;
