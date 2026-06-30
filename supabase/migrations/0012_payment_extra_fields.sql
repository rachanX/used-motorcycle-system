-- =====================================================================
-- Migration 0012: Payment extra fields + contract financial additions
-- =====================================================================

-- Payments: new tracking columns
alter table public.payments
  add column if not exists penalty_fee        numeric(12,2) not null default 0,
  add column if not exists receipt_number     text,
  add column if not exists bank               text,
  add column if not exists custom_bank_name   text;

-- Contracts: new financial columns
alter table public.contracts
  add column if not exists total_financing      numeric(12,2),
  add column if not exists payment_on_delivery  numeric(12,2) default 0,
  add column if not exists guarantor_address    text;

-- Back-fill total_financing for existing contracts
update public.contracts
set total_financing = coalesce(finance_amount, 0) + coalesce(total_interest, 0)
where total_financing is null;
