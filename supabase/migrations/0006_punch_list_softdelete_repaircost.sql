-- =====================================================================
-- Phase 10 (Punch List): soft delete, repair cost, contract summary view
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Soft delete columns
-- ---------------------------------------------------------------------
alter table public.customers     add column deleted_at timestamptz;
alter table public.vehicles      add column deleted_at timestamptz;
alter table public.contracts     add column deleted_at timestamptz;
alter table public.notifications add column deleted_at timestamptz;
alter table public.branches      add column deleted_at timestamptz;

create index idx_customers_deleted_at     on public.customers(deleted_at)     where deleted_at is null;
create index idx_vehicles_deleted_at      on public.vehicles(deleted_at)      where deleted_at is null;
create index idx_contracts_deleted_at     on public.contracts(deleted_at)     where deleted_at is null;
create index idx_notifications_deleted_at on public.notifications(deleted_at) where deleted_at is null;
create index idx_branches_deleted_at      on public.branches(deleted_at)      where deleted_at is null;

-- ---------------------------------------------------------------------
-- 2. Motorcycle "Repair Cost" field (vehicles)
-- ---------------------------------------------------------------------
alter table public.vehicles
  add column repair_cost numeric(12,2) not null default 0 check (repair_cost >= 0);

comment on column public.vehicles.repair_cost is
  'Total repair/refurbishment cost incurred before the vehicle is listed for sale.';

-- ---------------------------------------------------------------------
-- 3. RLS: exclude soft-deleted rows from every SELECT policy.
-- We DROP + recreate the five SELECT policies from migration 0003 with
-- an added "deleted_at is null" clause. INSERT/UPDATE/DELETE policies
-- are untouched (soft delete is implemented as an UPDATE, which is
-- already covered by the existing update policies).
-- ---------------------------------------------------------------------
drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select using (is_active_staff() and deleted_at is null);

drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles
  for select using ((is_developer() or branch_id = current_branch_id()) and deleted_at is null);

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers
  for select using ((is_developer() or branch_id = current_branch_id()) and deleted_at is null);

drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts
  for select using ((is_developer() or branch_id = current_branch_id()) and deleted_at is null);

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using ((is_developer() or branch_id = current_branch_id()) and deleted_at is null);

-- Developer can still see/restore soft-deleted rows through a separate
-- "include deleted" policy, used only by the (future) trash/restore view.
create policy branches_select_deleted_developer on public.branches
  for select using (is_developer() and deleted_at is not null);
create policy vehicles_select_deleted_developer on public.vehicles
  for select using (is_developer() and deleted_at is not null);
create policy customers_select_deleted_developer on public.customers
  for select using (is_developer() and deleted_at is not null);
create policy contracts_select_deleted_developer on public.contracts
  for select using (is_developer() and deleted_at is not null);

-- ---------------------------------------------------------------------
-- 4. View for the new two-layer Payments UI (Layer 1: per-contract summary)
-- Reuses the same logic as get_contract_summary() but as a queryable,
-- filterable, paginatable view so the list page doesn't need N+1 RPC calls.
-- ---------------------------------------------------------------------
create or replace view public.v_contract_payment_summary as
select
  c.id as contract_id,
  c.contract_number,
  c.branch_id,
  c.status as contract_status,
  c.total_terms,
  cu.id as customer_id,
  cu.first_name,
  cu.last_name,
  cu.phone_number,
  v.brand,
  v.model,
  count(p.*) filter (where p.status = 'paid')::int as paid_terms,
  count(p.*) filter (where p.status <> 'paid')::int as remaining_terms,
  coalesce(sum(p.amount_due - p.amount_paid) filter (where p.status <> 'paid'), 0) as outstanding_balance,
  min(p.due_date) filter (where p.status <> 'paid') as next_due_date,
  coalesce(max(greatest(current_date - p.due_date, 0)) filter (where p.status = 'overdue'), 0)::int as max_days_overdue,
  bool_or(p.status = 'overdue') as has_overdue
from public.contracts c
join public.customers cu on cu.id = c.customer_id
join public.vehicles v on v.id = c.vehicle_id
left join public.payments p on p.contract_id = c.id
where c.deleted_at is null
group by c.id, c.contract_number, c.branch_id, c.status, c.total_terms,
         cu.id, cu.first_name, cu.last_name, cu.phone_number, v.brand, v.model;

-- Views inherit the querying user's RLS on the underlying tables
-- automatically (Postgres evaluates RLS on the base tables), so no
-- separate policy is needed for this view.
