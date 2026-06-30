-- =====================================================================
-- Migration 0017: Fix overdue count + grant SELECT on all views
-- =====================================================================
-- Two problems fixed:
-- 1. v_dashboard_summary counted overdue via contracts.status = 'overdue'
--    which only updates when a payment row changes. Fixed to detect
--    overdue directly from payment due dates (same as v_overdue_customers).
-- 2. All views were missing GRANT SELECT to authenticated — causing the
--    dashboard and other pages to show 0 / empty data.
-- =====================================================================

-- ----- Fix v_dashboard_summary ----------------------------------------
drop view if exists public.v_dashboard_summary;
create view public.v_dashboard_summary as
select
  b.id as branch_id,
  b.branch_name,
  count(distinct v.id) filter (where v.status = 'available')    as available_vehicles,
  count(distinct v.id) filter (where v.status = 'reserved')     as reserved_vehicles,
  count(distinct v.id) filter (where v.status = 'under_repair') as under_repair_vehicles,
  count(distinct v.id) filter (where v.status = 'sold_cash')    as cash_sold_vehicles,
  count(distinct v.id)                                           as total_vehicles,
  count(distinct c.id) filter (where c.status = 'active')       as active_contracts,
  count(distinct c.id) filter (where c.status = 'completed')    as completed_contracts,
  -- Detect overdue by actual payment due dates, not contracts.status
  count(distinct c.id) filter (
    where exists (
      select 1 from public.payments p2
      where p2.contract_id = c.id
        and p2.due_date < current_date
        and p2.status != 'paid'
    )
  ) as overdue_contracts,
  coalesce(
    sum(p.amount_due - p.amount_paid) filter (where p.status != 'paid'),
    0
  ) as outstanding_balance
from public.branches b
left join public.vehicles  v on v.branch_id = b.id and v.deleted_at is null
left join public.contracts c on c.branch_id = b.id and c.deleted_at is null
left join public.payments  p on p.contract_id = c.id
group by b.id, b.branch_name;

-- ----- Grant SELECT on all views to authenticated users ---------------
-- DROP + CREATE loses existing grants; restore them all here.
grant select on public.v_dashboard_summary        to authenticated;
grant select on public.v_overdue_customers        to authenticated;
grant select on public.v_contract_payment_summary to authenticated;
grant select on public.v_sold_vehicles            to authenticated;

-- Revoke public (anon) access — views must only be readable by logged-in users.
revoke select on public.v_dashboard_summary        from anon;
revoke select on public.v_overdue_customers        from anon;
revoke select on public.v_contract_payment_summary from anon;
revoke select on public.v_sold_vehicles            from anon;
