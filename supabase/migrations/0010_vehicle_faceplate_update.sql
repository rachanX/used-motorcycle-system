-- =====================================================================
-- Faceplate update: Add Motorcycle form changes
-- 1. New vehicle status: "Under Repair" / "ระหว่างซ่อม"
-- 2. Registration book / tax invoice receipt tracking
--    (mirrors the original spreadsheet columns: รับเล่ม, ใบกำกับ, วันที่รับ)
-- =====================================================================

alter type vehicle_status add value if not exists 'under_repair';

alter table public.vehicles
  add column received_registration_book boolean not null default false,
  add column received_tax_invoice boolean not null default false,
  add column registration_received_date date;

comment on column public.vehicles.received_registration_book is
  'Whether the vehicle registration book (เล่มทะเบียน) has been received from the seller.';
comment on column public.vehicles.received_tax_invoice is
  'Whether the tax invoice (ใบกำกับภาษี) has been received from the seller.';
comment on column public.vehicles.registration_received_date is
  'Date the registration book was received, entered manually by staff.';

-- Note: Supplier Company (supplier_company) is intentionally left in the
-- database — only removed from the Add/Edit Motorcycle form per request.
-- Existing historical data and the inventory list filter are unaffected.
