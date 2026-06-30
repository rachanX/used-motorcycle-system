-- =====================================================================
-- Fix #1: Unique constraints (stock_code, vin_number, national_id,
-- branch_code, contract_number) currently apply globally, including to
-- soft-deleted rows. So deleting a vehicle and creating a new one with
-- the same stock code fails with "already in use" even though the old
-- row is invisible everywhere in the app. Convert these to PARTIAL
-- unique indexes that only enforce uniqueness among non-deleted rows.
-- =====================================================================

alter table public.vehicles drop constraint if exists vehicles_stock_code_key;
create unique index vehicles_stock_code_unique_active
  on public.vehicles(stock_code) where deleted_at is null;

alter table public.vehicles drop constraint if exists vehicles_vin_number_key;
create unique index vehicles_vin_number_unique_active
  on public.vehicles(vin_number) where deleted_at is null and vin_number is not null;

alter table public.customers drop constraint if exists customers_national_id_key;
create unique index customers_national_id_unique_active
  on public.customers(national_id) where deleted_at is null and national_id is not null;

alter table public.branches drop constraint if exists branches_branch_code_key;
create unique index branches_branch_code_unique_active
  on public.branches(branch_code) where deleted_at is null;

alter table public.contracts drop constraint if exists contracts_contract_number_key;
create unique index contracts_contract_number_unique_active
  on public.contracts(contract_number) where deleted_at is null;

-- The one-active-contract-per-vehicle index from Phase 1 already had a
-- WHERE clause (status = 'active'), so it's unaffected by soft delete
-- and needs no change.

-- =====================================================================
-- Fix #2 (code-side fix is in user-actions.ts / user-table.tsx):
-- A bug in the "Edit User" form caused disabled HTML fields (role,
-- is_active when editing your own profile) to be silently dropped from
-- the submission entirely, which made every self-edit deactivate your
-- own developer account. If you edited your own profile before this
-- fix was deployed, run this NOW to reactivate yourself (replace the
-- email):
-- =====================================================================
-- update public.users set role = 'developer', is_active = true
--   where email = 'your-email@example.com';

