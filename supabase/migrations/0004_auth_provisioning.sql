-- =====================================================================
-- Phase 2: Auth wiring
-- Auto-creates a public.users profile whenever a new auth.users row
-- appears (invite or sign-up). Role/branch default to 'staff'/null and
-- must be set by a developer afterwards in the Manage Users screen.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'staff',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Bootstrap: the very first user must be promoted to 'developer' by hand
-- (RLS blocks staff from changing roles, by design). Run once after the
-- owner's first sign-up, replacing the email:
-- ---------------------------------------------------------------------
-- update public.users set role = 'developer', branch_id = null
--   where email = 'owner@example.com';

-- ---------------------------------------------------------------------
-- Login/logout/failed-login audit logging.
-- Supabase Auth doesn't expose direct DB hooks for these on the free
-- tier without Edge Functions, so we log them from the app layer
-- (see src/lib/supabase/auth-actions.ts) via this helper RPC, callable
-- by the authenticated user themselves.
-- ---------------------------------------------------------------------
create or replace function public.log_auth_event(
  p_action audit_action,
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, table_name, record_id)
  values (auth.uid(), p_action, 'auth.users', coalesce(auth.uid()::text, p_email));
end;
$$;

grant execute on function public.log_auth_event(audit_action, text) to authenticated, anon;
