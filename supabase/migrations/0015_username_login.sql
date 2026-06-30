-- =====================================================================
-- Migration 0015: Add username field for login
-- =====================================================================
-- Supabase Auth is email-based internally, but staff should log in with
-- a simple username. We store the username in public.users and do an
-- email lookup server-side before calling signInWithPassword.
-- =====================================================================

-- 1. Add username column (nullable first so existing rows don't break)
alter table public.users
  add column if not exists username text unique;

-- 2. Auto-populate from email for existing users (part before @)
update public.users
  set username = lower(split_part(email, '@', 1))
  where username is null;

-- 3. Make it NOT NULL now that all rows have a value
alter table public.users
  alter column username set not null;
