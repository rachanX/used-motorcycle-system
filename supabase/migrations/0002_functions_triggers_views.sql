-- =====================================================================
-- USED CAR MANAGEMENT SYSTEM
-- Phase 1b: Functions, Triggers, Views
-- =====================================================================

-- ---------------------------------------------------------------------
-- FUNCTION: generate_payment_schedule
-- Auto-creates the installment rows when a contract is created.
-- ---------------------------------------------------------------------
create or replace function public.generate_payment_schedule()
returns trigger
language plpgsql
as $$
declare
  i int;
  v_due_date date;
begin
  for i in 1..new.total_terms loop
    v_due_date := (new.start_date + (i || ' months')::interval)::date;
    -- pin to the contract's due_day where the month allows it
    v_due_date := make_date(
      extract(year from v_due_date)::int,
      extract(month from v_due_date)::int,
      least(new.due_day, extract(day from (date_trunc('month', v_due_date) + interval '1 month - 1 day'))::int)
    );

    insert into public.payments (contract_id, installment_number, due_date, amount_due, status)
    values (new.id, i, v_due_date, new.monthly_installment, 'pending');
  end loop;
  return new;
end;
$$;

create trigger trg_generate_payment_schedule
  after insert on public.contracts
  for each row execute function public.generate_payment_schedule();

-- ---------------------------------------------------------------------
-- FUNCTION: refresh_payment_status
-- Recomputes a payment's status whenever it's inserted/updated,
-- and cascades contract status (active/completed/overdue).
-- ---------------------------------------------------------------------
create or replace function public.refresh_payment_status()
returns trigger
language plpgsql
as $$
declare
  v_contract record;
  v_remaining int;
  v_has_overdue boolean;
begin
  if new.amount_paid >= new.amount_due and new.amount_due > 0 then
    new.status := 'paid';
    if new.payment_date is null then
      new.payment_date := current_date;
    end if;
  elsif new.due_date < current_date then
    new.status := 'overdue';
  else
    new.status := 'pending';
  end if;

  return new;
end;
$$;

create trigger trg_refresh_payment_status
  before insert or update of amount_paid, due_date on public.payments
  for each row execute function public.refresh_payment_status();

-- After payment status settles, roll the result up to the contract.
create or replace function public.sync_contract_status()
returns trigger
language plpgsql
as $$
declare
  v_total int;
  v_paid int;
  v_overdue int;
begin
  select count(*), count(*) filter (where status = 'paid'),
         count(*) filter (where status = 'overdue')
    into v_total, v_paid, v_overdue
    from public.payments
   where contract_id = new.contract_id;

  if v_paid = v_total then
    update public.contracts set status = 'completed', end_date = current_date
     where id = new.contract_id and status <> 'completed';
    update public.vehicles v set status = 'closed_contract'
     from public.contracts c
     where c.id = new.contract_id and v.id = c.vehicle_id;
  elsif v_overdue > 0 then
    update public.contracts set status = 'overdue'
     where id = new.contract_id and status not in ('cancelled','completed');
  else
    update public.contracts set status = 'active'
     where id = new.contract_id and status not in ('cancelled','completed');
  end if;

  return new;
end;
$$;

create trigger trg_sync_contract_status
  after insert or update of status on public.payments
  for each row execute function public.sync_contract_status();

-- ---------------------------------------------------------------------
-- FUNCTION: contract financial summary (used by API / contract detail page)
-- ---------------------------------------------------------------------
create or replace function public.get_contract_summary(p_contract_id uuid)
returns table (
  contract_id uuid,
  total_terms int,
  paid_terms int,
  remaining_terms int,
  outstanding_balance numeric,
  next_due_date date,
  max_days_overdue int
)
language sql
stable
as $$
  select
    c.id,
    c.total_terms,
    count(p.*) filter (where p.status = 'paid')::int as paid_terms,
    count(p.*) filter (where p.status <> 'paid')::int as remaining_terms,
    coalesce(sum(p.amount_due - p.amount_paid) filter (where p.status <> 'paid'), 0) as outstanding_balance,
    min(p.due_date) filter (where p.status <> 'paid') as next_due_date,
    coalesce(max(greatest(current_date - p.due_date, 0)) filter (where p.status = 'overdue'), 0)::int as max_days_overdue
  from public.contracts c
  left join public.payments p on p.contract_id = c.id
  where c.id = p_contract_id
  group by c.id, c.total_terms;
$$;

-- ---------------------------------------------------------------------
-- FUNCTION: generate_due_notifications
-- Run on a schedule (Supabase Cron / pg_cron) to populate notifications.
-- ---------------------------------------------------------------------
create or replace function public.generate_due_notifications()
returns void
language plpgsql
as $$
begin
  insert into public.notifications (type, contract_id, payment_id, customer_id, branch_id, message)
  select
    case
      when p.due_date = current_date then 'due_today'
      when p.due_date = current_date + 1 then 'due_tomorrow'
      when p.due_date between current_date + 2 and current_date + 7 then 'due_within_7_days'
      when p.due_date = current_date - 1 then 'overdue_1_day'
      when p.due_date = current_date - 3 then 'overdue_3_days'
      when p.due_date = current_date - 7 then 'overdue_7_days'
      when p.due_date = current_date - 30 then 'overdue_30_days'
    end::notification_type as type,
    c.id, p.id, c.customer_id, c.branch_id,
    'Installment #' || p.installment_number || ' for contract ' || c.contract_number ||
      ' is ' || case when p.due_date < current_date then 'overdue since ' else 'due on ' end || p.due_date
  from public.payments p
  join public.contracts c on c.id = p.contract_id
  where p.status in ('pending','overdue')
    and (
      p.due_date in (current_date, current_date + 1, current_date - 1, current_date - 3, current_date - 7, current_date - 30)
      or p.due_date between current_date + 2 and current_date + 7
    )
    -- avoid duplicate notifications for the same payment/day
    and not exists (
      select 1 from public.notifications n
      where n.payment_id = p.id
        and n.created_at::date = current_date
    );
end;
$$;

-- ---------------------------------------------------------------------
-- VIEW: dashboard_summary  (per-branch + global, used by Module 7)
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
left join public.vehicles v on v.branch_id = b.id
left join public.contracts c on c.branch_id = b.id
left join public.payments p on p.contract_id = c.id
group by b.id, b.branch_name;

-- ---------------------------------------------------------------------
-- VIEW: overdue customers (Module 6/7 quick lookup)
-- ---------------------------------------------------------------------
create or replace view public.v_overdue_customers as
select
  cu.id as customer_id,
  cu.first_name, cu.last_name, cu.phone_number,
  c.id as contract_id, c.contract_number, c.branch_id,
  p.id as payment_id, p.installment_number, p.due_date,
  (current_date - p.due_date) as days_overdue,
  (p.amount_due - p.amount_paid) as amount_outstanding
from public.payments p
join public.contracts c on c.id = p.contract_id
join public.customers cu on cu.id = c.customer_id
where p.status = 'overdue'
order by days_overdue desc;

-- ---------------------------------------------------------------------
-- GENERIC AUDIT TRIGGER
-- Attach to any table whose changes must be logged.
-- ---------------------------------------------------------------------
create or replace function public.audit_trigger_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(user_id, action, table_name, record_id, new_value)
    values (v_user, 'create', tg_table_name, new.id::text, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(user_id, action, table_name, record_id, old_value, new_value)
    values (v_user, 'update', tg_table_name, new.id::text, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs(user_id, action, table_name, record_id, old_value)
    values (v_user, 'delete', tg_table_name, old.id::text, to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create trigger trg_audit_vehicles
  after insert or update or delete on public.vehicles
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_customers
  after insert or update or delete on public.customers
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_contracts
  after insert or update or delete on public.contracts
  for each row execute function public.audit_trigger_fn();
create trigger trg_audit_payments
  after insert or update or delete on public.payments
  for each row execute function public.audit_trigger_fn();
