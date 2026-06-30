-- =====================================================================
-- Fix: migration 0006 added permissive "see deleted rows" SELECT
-- policies intended for a future trash/restore feature. Since that
-- feature doesn't exist yet, those extra policies combined (OR'd) with
-- the normal policies and made every soft-deleted row visible to
-- Developers again everywhere in the app — defeating soft delete
-- entirely for the Developer role. Removing them here; they can be
-- reintroduced later, scoped to a dedicated /trash page only.
-- =====================================================================

drop policy if exists branches_select_deleted_developer on public.branches;
drop policy if exists vehicles_select_deleted_developer on public.vehicles;
drop policy if exists customers_select_deleted_developer on public.customers;
drop policy if exists contracts_select_deleted_developer on public.contracts;

-- ---------------------------------------------------------------------
-- The Phase 1 dashboard views were created before soft delete existed,
-- so they never excluded deleted_at rows. Recreate them with the filter.
-- ---------------------------------------------------------------------
create or replace view public.v_dashboard_summary as
select
  b.id as branch_id,
  b.branch_name,
  count(distinct v.id) filter (where v.status = 'available') as available_vehicles,
  count(distinct v.id) filter (where v.status = 'reserved') as reserved_vehicles,
  count(distinct v.id) as total_vehicles,
  count(distinct c.id) filter (where c.status = 'active') as active_contracts,
  count(distinct c.id) filter (where c.status = 'completed') as completed_contracts,
  count(distinct c.id) filter (where c.status = 'overdue') as overdue_contracts,
  coalesce(sum(p.amount_due - p.amount_paid) filter (where p.status <> 'paid'), 0) as outstanding_balance
from public.branches b
left join public.vehicles v on v.branch_id = b.id and v.deleted_at is null
left join public.contracts c on c.branch_id = b.id and c.deleted_at is null
left join public.payments p on p.contract_id = c.id
where b.deleted_at is null
group by b.id, b.branch_name;

create or replace view public.v_overdue_customers as
select
  cu.id as customer_id,
  cu.first_name, cu.last_name, cu.phone_number,
  c.id as contract_id, c.contract_number, c.branch_id,
  p.id as payment_id, p.installment_number, p.due_date,
  (current_date - p.due_date) as days_overdue,
  (p.amount_due - p.amount_paid) as amount_outstanding
from public.payments p
join public.contracts c on c.id = p.contract_id and c.deleted_at is null
join public.customers cu on cu.id = c.customer_id and cu.deleted_at is null
where p.status = 'overdue'
order by days_overdue desc;
