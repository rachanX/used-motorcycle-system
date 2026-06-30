-- =====================================================================
-- Migration 0016: Fix handle_new_user trigger to include username
-- =====================================================================
-- Migration 0015 made username NOT NULL on public.users, but the
-- handle_new_user() trigger (from 0004) did not include username in
-- its INSERT — causing admin.auth.admin.createUser() to fail with a
-- NOT NULL constraint violation, which Supabase surfaces as "{}".
--
-- Fix: include username in the trigger INSERT.
--  1. Prefer the username passed via user_metadata (set by inviteUserAction).
--  2. Fall back to the email-prefix (same logic used in the 0015 backfill).
--  3. On unique-constraint conflict (two users same email prefix) fall back
--     to a UUID-derived placeholder — the developer can then edit via the
--     Manage Users screen.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  -- 1. Prefer username explicitly passed in user_metadata (set by our invite flow).
  -- 2. Fall back to the part before @ in the email.
  v_username := coalesce(
    lower(nullif(trim(new.raw_user_meta_data->>'username'), '')),
    lower(split_part(new.email, '@', 1))
  );

  -- Safety: ensure it's never empty (shouldn't happen, but guards edge cases)
  if v_username is null or v_username = '' then
    v_username := 'u_' || lower(left(replace(new.id::text, '-', ''), 16));
  end if;

  insert into public.users (id, full_name, email, username, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_username,
    'staff',
    true
  )
  on conflict (id) do nothing;

  return new;

exception when unique_violation then
  -- Username conflict (e.g. two users with the same email prefix).
  -- Fall back to a UUID-based placeholder; developer can rename later.
  insert into public.users (id, full_name, email, username, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'u_' || lower(left(replace(new.id::text, '-', ''), 16)),
    'staff',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
