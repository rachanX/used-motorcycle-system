-- =====================================================================
-- Migration 0013: Balance field, notification fix, dashboard view fix
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Add `balance` column to contracts
--    Stores the manually entered starting balance (ยอดคงเหลือ) entered
--    by staff at contract creation or edit. Used as the starting point
--    for the running balance in the payment schedule table.
-- ---------------------------------------------------------------------
alter table public.contracts
  add column if not exists balance numeric(12,2);

-- ---------------------------------------------------------------------
-- 2. Fix generate_due_notifications()
--    - Make it SECURITY DEFINER so it can insert into notifications
--      even when called by a staff user (via the app server action).
--    - Fix the overdue detection: also catch 'pending' payments whose
--      due_date has already passed (status may still read 'pending' if
--      the payment row was never updated after the due_date elapsed).
--    - Broaden the overdue window from exact-day to range checks so
--      notifications aren't missed if the function was called late.
-- ---------------------------------------------------------------------
create or replace function public.generate_due_notifications()
returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications (type, contract_id, payment_id, customer_id, branch_id, message)
  select
    case
      when p.due_date = current_date              then 'due_today'
      when p.due_date = current_date + 1          then 'due_tomorrow'
      when p.due_date between current_date + 2
                          and current_date + 7    then 'due_within_7_days'
      when p.due_date between current_date - 3
                          and current_date - 1    then 'overdue_1_day'
      when p.due_date between current_date - 7
                          and current_date - 4    then 'overdue_3_days'
      when p.due_date between current_date - 14
                          and current_date - 8    then 'overdue_7_days'
      when p.due_date <= current_date - 15        then 'overdue_30_days'
    end::notification_type as type,
    c.id,
    p.id,
    c.customer_id,
    c.branch_id,
    'งวดที่ ' || p.installment_number || ' สัญญา ' || c.contract_number ||
      case
        when p.due_date < current_date
          then ' ค้างชำระตั้งแต่ ' || to_char(p.due_date, 'DD/MM/YYYY')
          else ' ครบกำหนด ' || to_char(p.due_date, 'DD/MM/YYYY')
      end as message
  from public.payments p
  join public.contracts c on c.id = p.contract_id and c.deleted_at is null
  where
    -- Include any unpaid payment in the relevant date windows
    p.status != 'paid'
    and (
      -- Upcoming
      p.due_date between current_date and current_date + 7
      -- Overdue (catch even payments still labelled 'pending' after due_date passed)
      or p.due_date < current_date
    )
    -- Suppress notifications for deleted payments or very old overdue (> 60 days)
    and p.due_date >= current_date - 60
    -- One notification per payment per day
    and not exists (
      select 1 from public.notifications n
      where n.payment_id = p.id
        and n.created_at::date = current_date
        and n.deleted_at is null
    );
end;
$$;

grant execute on function public.generate_due_notifications() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Fix v_dashboard_summary to exclude soft-deleted vehicles/contracts
--    DROP first because CREATE OR REPLACE cannot rename or reorder columns.
-- ---------------------------------------------------------------------
drop view if exists public.v_dashboard_summary;
create view public.v_dashboard_summary as
select
  b.id as branch_id,
  b.branch_name,
  count(distinct v.id) filter (where v.status = 'available')     as available_vehicles,
  count(distinct v.id) filter (where v.status = 'reserved')      as reserved_vehicles,
  count(distinct v.id) filter (where v.status = 'under_repair')  as under_repair_vehicles,
  count(distinct v.id)                                            as total_vehicles,
  count(distinct c.id) filter (where c.status = 'active')        as active_contracts,
  count(distinct c.id) filter (where c.status = 'completed')     as completed_contracts,
  count(distinct c.id) filter (where c.status = 'overdue')       as overdue_contracts,
  coalesce(
    sum(p.amount_due - p.amount_paid) filter (where p.status != 'paid'),
    0
  ) as outstanding_balance
from public.branches b
left join public.vehicles  v on v.branch_id = b.id  and v.deleted_at is null
left join public.contracts c on c.branch_id = b.id  and c.deleted_at is null
left join public.payments  p on p.contract_id = c.id
group by b.id, b.branch_name;

-- ---------------------------------------------------------------------
-- 4. Relax contracts.total_terms NOT NULL constraint
--    Migration 0011 dropped the trigger that auto-generated payment rows
--    from total_terms, but forgot to drop the NOT NULL + check (> 0)
--    constraint. With manual payment rows, total_terms is now an
--    informational field and may be left blank at contract creation.
--    NULL passes the check (total_terms > 0) automatically in Postgres.
-- ---------------------------------------------------------------------
alter table public.contracts alter column total_terms drop not null;

-- ---------------------------------------------------------------------
-- 5. Fix v_overdue_customers
--    Previous version relied on p.status = 'overdue', but the status
--    trigger only fires on UPDATE of amount_paid/due_date — payments
--    that were never touched after their due_date remained 'pending'.
--    Fix: treat any unpaid payment whose due_date < today as overdue.
-- ---------------------------------------------------------------------
drop view if exists public.v_overdue_customers;
create view public.v_overdue_customers as
select
  cu.id  as customer_id,
  cu.first_name, cu.last_name, cu.phone_number,
  c.id   as contract_id, c.contract_number, c.branch_id,
  p.id   as payment_id, p.installment_number, p.due_date,
  (current_date - p.due_date)::int          as days_overdue,
  (p.amount_due - p.amount_paid)            as amount_outstanding
from public.payments p
join public.contracts c  on c.id  = p.contract_id and c.deleted_at is null
join public.customers cu on cu.id = c.customer_id and cu.deleted_at is null
where p.status != 'paid'
  and p.due_date < current_date
  and p.amount_due > p.amount_paid
order by days_overdue desc;

-- ---------------------------------------------------------------------
-- 5. Optional pg_cron job (runs if pg_cron extension is enabled)
--    Automatically generates notifications at 07:00 Asia/Bangkok every day.
--    To enable: run "create extension if not exists pg_cron;" as superuser,
--    then uncomment the block below and re-run this migration.
-- ---------------------------------------------------------------------
-- select cron.schedule(
--   'daily-due-notifications',
--   '0 7 * * *',
--   $$select public.generate_due_notifications();$$
-- );
