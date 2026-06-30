-- =====================================================================
-- Seed data for local development only. Do NOT run in production.
-- =====================================================================

insert into public.branches (branch_code, branch_name, address, phone_number, status) values
  ('BR01', 'Bangkok Central',  '123 Sukhumvit Rd, Bangkok',  '02-111-1111', 'active'),
  ('BR02', 'Chiang Mai',       '45 Nimman Rd, Chiang Mai',   '053-222-222', 'active'),
  ('BR03', 'Pattaya',          '78 Sukhumvit Rd, Chon Buri', '038-333-333', 'active'),
  ('BR04', 'Khon Kaen',        '12 Mittraphap Rd, Khon Kaen','043-444-444', 'active');

-- NOTE: users rows must be created AFTER the corresponding auth.users
-- row exists (Supabase Auth sign-up / invite). See Phase 2 for the
-- handle_new_user() trigger that auto-creates the public.users profile.
