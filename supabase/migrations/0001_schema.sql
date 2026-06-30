-- =====================================================================
-- USED CAR MANAGEMENT SYSTEM
-- Phase 1: Core Schema
-- Target: Supabase (PostgreSQL 15+)
-- =====================================================================

-- ---------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy / ILIKE search indexes

-- ---------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------
create type user_role as enum ('developer', 'staff');

create type branch_status as enum ('active', 'inactive');

create type vehicle_status as enum (
  'available', 'reserved', 'financing', 'sold_cash', 'closed_contract'
);

create type contract_status as enum (
  'active', 'completed', 'overdue', 'cancelled'
);

create type payment_status as enum ('paid', 'pending', 'overdue');

create type payment_method as enum (
  'cash', 'bank_transfer', 'qr_promptpay', 'other'
);

create type notification_type as enum (
  'due_today', 'due_tomorrow', 'due_within_7_days',
  'overdue_1_day', 'overdue_3_days', 'overdue_7_days', 'overdue_30_days'
);

create type audit_action as enum (
  'login', 'logout', 'failed_login',
  'create', 'update', 'delete'
);

-- ---------------------------------------------------------------------
-- TABLE: users
-- Mirrors auth.users (Supabase Auth). One row per authenticated user.
-- ---------------------------------------------------------------------
create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null unique,
  phone         text,
  role          user_role not null default 'staff',
  branch_id     uuid,                       -- nullable: developer sees all branches
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'Application users mapped 1:1 to auth.users. role determines RBAC.';

-- ---------------------------------------------------------------------
-- TABLE: branches
-- ---------------------------------------------------------------------
create table public.branches (
  id            uuid primary key default gen_random_uuid(),
  branch_code   text not null unique,
  branch_name   text not null,
  address       text,
  phone_number  text,
  status        branch_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.users
  add constraint users_branch_fk foreign key (branch_id)
  references public.branches(id) on delete set null;

create index idx_branches_status on public.branches(status);

-- ---------------------------------------------------------------------
-- TABLE: vehicles
-- ---------------------------------------------------------------------
create table public.vehicles (
  id                uuid primary key default gen_random_uuid(),
  stock_code        text not null unique,
  brand             text not null,
  model             text not null,
  sub_model         text,
  year              smallint not null check (year between 1980 and extract(year from now())::int + 1),
  color             text,
  license_plate     text,
  vin_number        text unique,
  engine_number     text,
  purchase_price    numeric(12,2) not null check (purchase_price >= 0),
  selling_price     numeric(12,2) not null check (selling_price >= 0),
  branch_id         uuid not null references public.branches(id) on delete restrict,
  status            vehicle_status not null default 'available',
  notes             text,
  created_by        uuid references public.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_vehicles_branch on public.vehicles(branch_id);
create index idx_vehicles_status on public.vehicles(status);
create index idx_vehicles_brand_model on public.vehicles(brand, model);
create index idx_vehicles_search_trgm on public.vehicles
  using gin ((coalesce(stock_code,'') || ' ' || coalesce(brand,'') || ' ' ||
              coalesce(model,'') || ' ' || coalesce(license_plate,'') || ' ' ||
              coalesce(vin_number,'')) gin_trgm_ops);
create index idx_vehicles_created_at on public.vehicles(created_at desc);

-- ---------------------------------------------------------------------
-- TABLE: customers
-- ---------------------------------------------------------------------
create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  last_name       text not null,
  phone_number    text not null,
  national_id     text unique,
  address         text,
  province        text,
  district        text,
  postal_code     text,
  guarantor_name  text,
  guarantor_phone text,
  notes           text,
  branch_id       uuid references public.branches(id) on delete set null,
  created_by      uuid references public.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_customers_phone on public.customers(phone_number);
create index idx_customers_national_id on public.customers(national_id);
create index idx_customers_branch on public.customers(branch_id);
create index idx_customers_search_trgm on public.customers
  using gin ((coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' ||
              coalesce(phone_number,'') || ' ' || coalesce(national_id,'')) gin_trgm_ops);

-- ---------------------------------------------------------------------
-- TABLE: contracts
-- ---------------------------------------------------------------------
create table public.contracts (
  id                  uuid primary key default gen_random_uuid(),
  contract_number     text not null unique,
  customer_id         uuid not null references public.customers(id) on delete restrict,
  vehicle_id          uuid not null references public.vehicles(id) on delete restrict,
  branch_id           uuid not null references public.branches(id) on delete restrict,
  sale_price          numeric(12,2) not null check (sale_price >= 0),
  down_payment        numeric(12,2) not null default 0 check (down_payment >= 0),
  finance_amount      numeric(12,2) not null check (finance_amount >= 0),
  monthly_installment numeric(12,2) not null check (monthly_installment >= 0),
  total_terms         smallint not null check (total_terms > 0),
  start_date          date not null,
  due_day             smallint not null check (due_day between 1 and 31),
  end_date            date,
  status              contract_status not null default 'active',
  created_by          uuid references public.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint chk_finance_matches check (finance_amount = sale_price - down_payment)
);

create index idx_contracts_customer on public.contracts(customer_id);
create index idx_contracts_vehicle on public.contracts(vehicle_id);
create index idx_contracts_branch on public.contracts(branch_id);
create index idx_contracts_status on public.contracts(status);
create index idx_contracts_start_date on public.contracts(start_date);

-- one active contract per vehicle at a time
create unique index uq_one_active_contract_per_vehicle
  on public.contracts(vehicle_id)
  where status = 'active';

-- ---------------------------------------------------------------------
-- TABLE: payments
-- ---------------------------------------------------------------------
create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  contract_id         uuid not null references public.contracts(id) on delete cascade,
  installment_number  smallint not null check (installment_number > 0),
  due_date            date not null,
  amount_due          numeric(12,2) not null check (amount_due >= 0),
  amount_paid         numeric(12,2) not null default 0 check (amount_paid >= 0),
  payment_date        date,
  payment_method      payment_method,
  status              payment_status not null default 'pending',
  notes               text,
  created_by          uuid references public.users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (contract_id, installment_number)
);

create index idx_payments_contract on public.payments(contract_id);
create index idx_payments_status on public.payments(status);
create index idx_payments_due_date on public.payments(due_date);
-- Critical for "overdue" / "due soon" dashboard queries at 500k+ scale
create index idx_payments_pending_due on public.payments(due_date)
  where status in ('pending', 'overdue');

-- ---------------------------------------------------------------------
-- TABLE: notifications
-- ---------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  type            notification_type not null,
  contract_id     uuid references public.contracts(id) on delete cascade,
  payment_id      uuid references public.payments(id) on delete cascade,
  customer_id     uuid references public.customers(id) on delete cascade,
  branch_id       uuid references public.branches(id) on delete cascade,
  message         text not null,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_notifications_unread on public.notifications(is_read, created_at desc);
create index idx_notifications_branch on public.notifications(branch_id);

-- ---------------------------------------------------------------------
-- TABLE: audit_logs  (developer-only visibility, enforced via RLS)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id            bigint generated always as identity primary key,
  user_id       uuid references public.users(id) on delete set null,
  action        audit_action not null,
  table_name    text,
  record_id     text,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    text,
  created_at    timestamptz not null default now()
);

create index idx_audit_logs_user on public.audit_logs(user_id);
create index idx_audit_logs_table_record on public.audit_logs(table_name, record_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- =====================================================================
-- updated_at auto-touch trigger (generic, reused on every table)
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger trg_branches_updated_at before update on public.branches
  for each row execute function public.set_updated_at();
create trigger trg_vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger trg_contracts_updated_at before update on public.contracts
  for each row execute function public.set_updated_at();
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
