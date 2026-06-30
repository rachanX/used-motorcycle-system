-- =====================================================================
-- Migration 0018: Fix outstanding_balance in v_contract_payment_summary
-- =====================================================================
-- Problem: outstanding_balance used sum(amount_due - amount_paid) for
-- unpaid rows, which counts future installment totals (e.g. 10 × 6,000
-- = 60,000). The payment detail page calculates remaining debt as
-- contract.balance - sum(all amount_paid), which gives the true
-- accounting balance (e.g. 32,000 - 11,000 = 21,000).
-- Fix: align both to use contract.balance - sum(amount_paid).
-- =====================================================================

drop view if exists public.v_contract_payment_summary;
create view public.v_contract_payment_summary as
select
  c.id                                                                    as contract_id,
  c.contract_number,
  c.branch_id,
  c.status                                                                as contract_status,
  c.total_terms,
  c.balance                                                               as contract_balance,
  cu.id                                                                   as customer_id,
  cu.first_name,
  cu.last_name,
  cu.phone_number,
  v.brand,
  v.model,
  count(p.*) filter (where p.status = 'paid')::int                       as paid_terms,
  count(p.*) filter (where p.status <> 'paid')::int                      as remaining_terms,
  -- Remaining debt = starting balance on contract minus all money received so far
  coalesce(c.balance, c.total_financing, c.finance_amount, 0)
    - coalesce(sum(p.amount_paid), 0)                                     as outstanding_balance,
  min(p.due_date) filter (where p.status <> 'paid')                      as next_due_date,
  coalesce(
    max(greatest(current_date - p.due_date, 0))
      filter (where p.status = 'overdue'),
    0
  )::int                                                                  as max_days_overdue,
  bool_or(p.status = 'overdue')                                          as has_overdue
from public.contracts c
join public.customers cu on cu.id = c.customer_id
join public.vehicles  v  on v.id  = c.vehicle_id
left join public.payments p on p.contract_id = c.id
where c.deleted_at is null
group by c.id, c.contract_number, c.branch_id, c.status, c.total_terms,
         c.balance, c.total_financing, c.finance_amount,
         cu.id, cu.first_name, cu.last_name, cu.phone_number,
         v.brand, v.model;

-- Restore grants (DROP VIEW loses them)
grant select on public.v_contract_payment_summary to authenticated;
revoke select on public.v_contract_payment_summary from anon;
