-- =====================================================================
-- Fix: persistent 42501 (insufficient_privilege) on UPDATE for
-- branches, despite is_developer() correctly resolving true (proven by
-- vehicle edits working under the same function). Two defensive fixes:
--
-- 1. Explicitly (re)grant table privileges to authenticated/anon roles.
--    Supabase normally sets these up automatically, but if migrations
--    were ever run through a path that bypassed Supabase's default
--    privilege grants, a table can end up RLS-correct but
--    grant-incomplete, which also produces 42501.
--
-- 2. Explicitly add WITH CHECK to every UPDATE policy instead of
--    relying on Postgres's implicit "USING doubles as WITH CHECK"
--    fallback — removes any doubt about that behavior.
-- =====================================================================

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on
  public.branches,
  public.vehicles,
  public.customers,
  public.contracts,
  public.payments,
  public.notifications,
  public.users
to authenticated;

grant select on public.audit_logs to authenticated;

-- All sequences/identity columns need usage too (audit_logs.id is
-- "generated always as identity").
grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------
-- Recreate UPDATE policies with explicit WITH CHECK (was implicit).
-- ---------------------------------------------------------------------
drop policy if exists branches_update_developer on public.branches;
create policy branches_update_developer on public.branches
  for update using (is_developer()) with check (is_developer());

drop policy if exists vehicles_update on public.vehicles;
create policy vehicles_update on public.vehicles
  for update using (is_developer() or branch_id = current_branch_id())
  with check (is_developer() or branch_id = current_branch_id());

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers
  for update using (is_developer() or branch_id = current_branch_id())
  with check (is_developer() or branch_id = current_branch_id());

drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts
  for update using (is_developer() or branch_id = current_branch_id())
  with check (is_developer() or branch_id = current_branch_id());

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
  for update using (
    is_developer() or exists (
      select 1 from public.contracts c
      where c.id = payments.contract_id and c.branch_id = current_branch_id()
    )
  )
  with check (
    is_developer() or exists (
      select 1 from public.contracts c
      where c.id = payments.contract_id and c.branch_id = current_branch_id()
    )
  );

drop policy if exists notifications_update_read_flag on public.notifications;
create policy notifications_update_read_flag on public.notifications
  for update using (is_developer() or branch_id = current_branch_id())
  with check (is_developer() or branch_id = current_branch_id());
