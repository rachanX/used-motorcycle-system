-- Other Cost (ค่าอื่นๆ): actual_cost = purchase_price + repair_cost + other_cost
-- Already applied on the live database; this file records it for rebuilds.

alter table public.vehicles
  add column if not exists other_cost numeric(12,2) not null default 0;

-- Generated column expressions can't be altered in place, so drop and re-add.
-- v_sold_vehicles depends on actual_cost, so drop it first and recreate below.
drop view if exists public.v_sold_vehicles;

alter table public.vehicles drop column if exists actual_cost;
alter table public.vehicles
  add column actual_cost numeric(12,2) generated always as
    (coalesce(purchase_price,0) + coalesce(repair_cost,0) + coalesce(other_cost,0)) stored;

create view public.v_sold_vehicles as
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
  v.deleted_at,
  v.sub_model, v.registration_year, v.mileage, v.date_received,
  v.previous_owner, v.vehicle_source,
  v.received_registration_book, v.received_tax_invoice, v.registration_received_date,
  v.created_at, v.updated_at,
  v.other_cost
from public.vehicles v
left join public.contracts c on c.vehicle_id = v.id and c.deleted_at is null
left join public.customers cu on cu.id = c.customer_id
where v.status in ('sold_cash', 'financing', 'closed_contract')
  and v.deleted_at is null;

grant select on public.v_sold_vehicles to authenticated;
revoke select on public.v_sold_vehicles from anon;
