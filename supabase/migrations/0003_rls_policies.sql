-- =====================================================================
-- USED CAR MANAGEMENT SYSTEM
-- Phase 1c: Row Level Security (RLS)
--
-- Model:
--   developer -> full access to everything, including audit_logs
--   staff     -> full CRUD on business tables, scoped to their branch
--                where relevant; NO access to audit_logs; cannot delete
--                vehicles/contracts/payments (soft restrictions enforced
--                at the RLS + API layer)
-- =====================================================================

-- Helper: is the calling user a developer?
create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'developer' and u.is_active
  );
$$;

-- Helper: caller's branch_id (null for developer = sees all)
create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.users where id = auth.uid();
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u where u.id = auth.uid() and u.is_active
  );
$$;

-- Enable RLS everywhere
alter table public.users         enable row level security;
alter table public.branches      enable row level security;
alter table public.vehicles      enable row level security;
alter table public.customers     enable row level security;
alter table public.contracts     enable row level security;
alter table public.payments      enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs    enable row level security;

-- ---------------------------------------------------------------------
-- users: developer manages everyone; staff can read own row & teammates
-- in same branch, update only their own profile (not their role).
-- ---------------------------------------------------------------------
create policy users_select on public.users
  for select using (is_developer() or id = auth.uid() or branch_id = current_branch_id());

create policy users_insert_developer on public.users
  for insert with check (is_developer());

create policy users_update on public.users
  for update using (is_developer() or id = auth.uid())
  with check (is_developer() or (id = auth.uid()));  -- app layer blocks role/branch self-edit

create policy users_delete_developer on public.users
  for delete using (is_developer());

-- ---------------------------------------------------------------------
-- branches: everyone authenticated can read; only developer writes.
-- ---------------------------------------------------------------------
create policy branches_select on public.branches
  for select using (is_active_staff());

create policy branches_write_developer on public.branches
  for insert with check (is_developer());

create policy branches_update_developer on public.branches
  for update using (is_developer());

create policy branches_delete_developer on public.branches
  for delete using (is_developer());

-- ---------------------------------------------------------------------
-- vehicles: developer sees/edits all; staff sees/edits own branch.
-- Only developer can delete.
-- ---------------------------------------------------------------------
create policy vehicles_select on public.vehicles
  for select using (is_developer() or branch_id = current_branch_id());

create policy vehicles_insert on public.vehicles
  for insert with check (is_developer() or branch_id = current_branch_id());

create policy vehicles_update on public.vehicles
  for update using (is_developer() or branch_id = current_branch_id());

create policy vehicles_delete_developer on public.vehicles
  for delete using (is_developer());

-- ---------------------------------------------------------------------
-- customers: same branch-scoped pattern
-- ---------------------------------------------------------------------
create policy customers_select on public.customers
  for select using (is_developer() or branch_id = current_branch_id());

create policy customers_insert on public.customers
  for insert with check (is_developer() or branch_id = current_branch_id());

create policy customers_update on public.customers
  for update using (is_developer() or branch_id = current_branch_id());

create policy customers_delete_developer on public.customers
  for delete using (is_developer());

-- ---------------------------------------------------------------------
-- contracts: branch-scoped; staff cannot delete (cancel instead via status)
-- ---------------------------------------------------------------------
create policy contracts_select on public.contracts
  for select using (is_developer() or branch_id = current_branch_id());

create policy contracts_insert on public.contracts
  for insert with check (is_developer() or branch_id = current_branch_id());

create policy contracts_update on public.contracts
  for update using (is_developer() or branch_id = current_branch_id());

create policy contracts_delete_developer on public.contracts
  for delete using (is_developer());

-- ---------------------------------------------------------------------
-- payments: scoped via parent contract's branch
-- ---------------------------------------------------------------------
create policy payments_select on public.payments
  for select using (
    is_developer() or exists (
      select 1 from public.contracts c
      where c.id = payments.contract_id and c.branch_id = current_branch_id()
    )
  );

create policy payments_insert on public.payments
  for insert with check (
    is_developer() or exists (
      select 1 from public.contracts c
      where c.id = payments.contract_id and c.branch_id = current_branch_id()
    )
  );

create policy payments_update on public.payments
  for update using (
    is_developer() or exists (
      select 1 from public.contracts c
      where c.id = payments.contract_id and c.branch_id = current_branch_id()
    )
  );

create policy payments_delete_developer on public.payments
  for delete using (is_developer());

-- ---------------------------------------------------------------------
-- notifications: branch-scoped read; system (service role) writes
-- ---------------------------------------------------------------------
create policy notifications_select on public.notifications
  for select using (is_developer() or branch_id = current_branch_id());

create policy notifications_update_read_flag on public.notifications
  for update using (is_developer() or branch_id = current_branch_id());

-- Inserts to notifications happen via service_role (cron job), so no
-- staff INSERT policy is defined — service_role bypasses RLS entirely.

-- ---------------------------------------------------------------------
-- audit_logs: DEVELOPER ONLY. Staff has zero visibility (no policy = deny).
-- Inserts come from the security-definer audit_trigger_fn, which runs
-- with elevated privileges, so no insert policy is needed for staff.
-- ---------------------------------------------------------------------
create policy audit_logs_select_developer on public.audit_logs
  for select using (is_developer());

-- No insert/update/delete policy for regular roles: the table is
-- effectively append-only via the trigger and read-only via the API.
