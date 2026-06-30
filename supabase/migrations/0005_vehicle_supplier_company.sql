-- =====================================================================
-- Phase 4.1: Add "Supplier / Source Company" field to vehicles
-- Free-text field (e.g. TAC, TV, TM, TS, or any future supplier code)
-- so staff can keep typing whatever prefix they already use without
-- being locked into a fixed list, while the app can still filter on it.
-- =====================================================================

alter table public.vehicles
  add column supplier_company text;

comment on column public.vehicles.supplier_company is
  'Free-text source/supplier company the vehicle was purchased from (e.g. TAC, TV, TM, TS).';

-- Supports the "filter by supplier" dropdown and search.
create index idx_vehicles_supplier_company on public.vehicles(supplier_company);

-- Let the existing trigram search index also catch supplier_company so
-- the global vehicle search box picks it up automatically.
drop index if exists public.idx_vehicles_search_trgm;
create index idx_vehicles_search_trgm on public.vehicles
  using gin ((coalesce(stock_code,'') || ' ' || coalesce(brand,'') || ' ' ||
              coalesce(model,'') || ' ' || coalesce(license_plate,'') || ' ' ||
              coalesce(vin_number,'') || ' ' || coalesce(supplier_company,'')) gin_trgm_ops);
