-- =====================================================================
-- Migration 0011: Full restructure for motorcycle management system
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DYNAMIC STOCK PREFIX TABLE
-- Allows adding new prefixes (TS, TV, TM, TAC, + future) without
-- code changes. Each prefix maintains its own running sequence.
-- ---------------------------------------------------------------------
create table public.stock_prefixes (
  id          uuid primary key default gen_random_uuid(),
  prefix      text not null unique,          -- 'TS', 'TV', 'TM', 'TAC'
  label       text not null,                 -- display label
  is_active   boolean not null default true,
  sort_order  smallint not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.stock_prefixes (prefix, label, sort_order) values
  ('TS',  'TS',  1),
  ('TV',  'TV',  2),
  ('TM',  'TM',  3),
  ('TAC', 'TAC', 4);

-- Per-prefix running sequence (no shared counter)
create table public.stock_sequences (
  prefix      text primary key references public.stock_prefixes(prefix),
  last_seq    int not null default 0
);

insert into public.stock_sequences (prefix, last_seq) values
  ('TS', 0), ('TV', 0), ('TM', 0), ('TAC', 0);

-- RLS
alter table public.stock_prefixes  enable row level security;
alter table public.stock_sequences enable row level security;

create policy stock_prefixes_select  on public.stock_prefixes  for select using (is_active_staff());
create policy stock_prefixes_write   on public.stock_prefixes  for all    using (is_developer()) with check (is_developer());
create policy stock_sequences_select on public.stock_sequences for select using (is_active_staff());
create policy stock_sequences_write  on public.stock_sequences for all    using (is_developer()) with check (is_developer());

-- ---------------------------------------------------------------------
-- 2. FUNCTION: next_stock_code(prefix)
-- Atomically increments and returns the next stock code for a prefix.
-- Called from the server action when adding a new vehicle.
-- ---------------------------------------------------------------------
create or replace function public.next_stock_code(p_prefix text)
returns text
language plpgsql
security definer
as $$
declare
  v_seq int;
begin
  update public.stock_sequences
  set last_seq = last_seq + 1
  where prefix = p_prefix
  returning last_seq into v_seq;

  if not found then
    raise exception 'Unknown stock prefix: %', p_prefix;
  end if;

  return p_prefix || '-' || v_seq::text;
end;
$$;

grant execute on function public.next_stock_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. NEW VEHICLE FIELDS
-- Remove selling_price from form (keep column for historical data),
-- add actual_cost as computed, add new faceplate fields.
-- ---------------------------------------------------------------------
alter table public.vehicles
  add column if not exists stock_prefix    text references public.stock_prefixes(prefix),
  add column if not exists mileage         int,
  add column if not exists date_received   date,
  add column if not exists previous_owner  text,
  add column if not exists vehicle_source  text
    check (vehicle_source in ('buy','trade_in','auction','other') or vehicle_source is null),
  add column if not exists actual_cost     numeric(12,2) generated always as
                             (coalesce(purchase_price,0) + coalesce(repair_cost,0)) stored;

-- Back-fill stock_prefix from existing stock_code patterns (best-effort)
update public.vehicles v
set stock_prefix = sp.prefix
from public.stock_prefixes sp
where v.stock_code like sp.prefix || '-%'
  and v.stock_prefix is null;

-- Back-fill sequences from existing codes so next_stock_code() stays
-- ahead of existing data and never produces a duplicate.
update public.stock_sequences ss
set last_seq = coalesce((
  select max(
    cast(regexp_replace(v.stock_code, '^' || ss.prefix || '-', '') as int)
  )
  from public.vehicles v
  where v.stock_code ~ ('^' || ss.prefix || '-[0-9]+$')
), 0);

-- ---------------------------------------------------------------------
-- 4. CONTRACTS — fully manual payment model
-- Drop NOT NULL from fields that used to be auto-calculated so staff
-- can leave them blank during initial entry and fill them manually.
-- Add new fields for the 5-section contract form.
-- ---------------------------------------------------------------------

-- Buyer details (previously just customer FK)
alter table public.contracts
  add column if not exists buyer_occupation    text,
  add column if not exists buyer_workplace     text,
  add column if not exists buyer_work_phone    text,
  -- Guarantor
  add column if not exists guarantor_occupation  text,
  add column if not exists guarantor_workplace   text,
  add column if not exists guarantor_work_phone  text,
  -- Vehicle snapshot (denormalized for archive integrity)
  add column if not exists vehicle_engine_no    text,
  add column if not exists vehicle_chassis_no   text,
  add column if not exists vehicle_old_plate    text,
  add column if not exists vehicle_new_plate    text,
  add column if not exists vehicle_color_snap   text,
  add column if not exists vehicle_model_snap   text,
  -- Financial (manual, no auto-calc)
  add column if not exists interest_rate        numeric(8,4),
  add column if not exists total_interest       numeric(12,2),
  add column if not exists document_fee         numeric(12,2) default 0,
  add column if not exists contract_sequence    int,   -- sequential within branch
  -- Allow NULL on previously auto-filled fields
  alter column end_date drop not null;

-- Per-branch contract sequence
create table if not exists public.contract_sequences (
  branch_id   uuid primary key references public.branches(id),
  last_seq    int not null default 0
);

alter table public.contract_sequences enable row level security;
create policy cs_select on public.contract_sequences for select using (is_active_staff());
create policy cs_write  on public.contract_sequences for all   using (is_developer()) with check (is_developer());

create or replace function public.next_contract_sequence(p_branch_id uuid)
returns int
language plpgsql
security definer
as $$
declare v_seq int;
begin
  insert into public.contract_sequences (branch_id, last_seq) values (p_branch_id, 1)
  on conflict (branch_id) do update set last_seq = contract_sequences.last_seq + 1
  returning last_seq into v_seq;
  return v_seq;
end;
$$;
grant execute on function public.next_contract_sequence(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. PAYMENTS — fully manual rows (no trigger-based auto-generation)
-- Remove the trigger that auto-creates installment rows on contract
-- insert. Staff will add rows manually one-by-one.
-- ---------------------------------------------------------------------
drop trigger if exists trg_generate_payment_schedule on public.contracts;

-- Add manual fields to payments
alter table public.payments
  add column if not exists actual_payment_date date; -- separate from payment_date (system date)

-- Remove NOT NULL on installment_number since staff add rows manually
-- (existing rows keep their values; constraint removed going forward)
alter table public.payments alter column installment_number drop not null;

-- ---------------------------------------------------------------------
-- 6. SOLD VEHICLES view (for the archive page)
-- ---------------------------------------------------------------------
create or replace view public.v_sold_vehicles as
select
  v.id as vehicle_id,
  v.stock_code,
  v.stock_prefix,
  v.brand, v.model, v.year, v.color,
  v.license_plate, v.vin_number, v.engine_number,
  v.purchase_price, v.repair_cost, v.actual_cost, v.selling_price,
  v.status,
  v.branch_id,
  c.id as contract_id,
  c.contract_number,
  c.customer_id,
  cu.first_name, cu.last_name, cu.phone_number,
  cu.guarantor_name, cu.guarantor_phone,
  c.sale_price, c.start_date, c.end_date,
  c.status as contract_status,
  v.deleted_at
from public.vehicles v
left join public.contracts c on c.vehicle_id = v.id and c.deleted_at is null
left join public.customers cu on cu.id = c.customer_id
where v.status in ('sold_cash', 'closed_contract');
