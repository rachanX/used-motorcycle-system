-- STEP 1: Check your account's actual role/active status
-- (this is the #1 cause of 42501 "permission denied" errors on delete)
select id, email, full_name, role, is_active from public.users order by created_at;

-- STEP 2: If your row shows role != 'developer' OR is_active = false,
-- fix it now (replace the email with your own):
update public.users
set role = 'developer', is_active = true
where email = 'YOUR_EMAIL_HERE';

-- STEP 3: Confirm migrations 0006/0007/0008 actually ran. This should
-- return rows for all three — if any are missing, run `supabase db push`.
select policyname from pg_policies
where tablename = 'branches' and policyname like '%deleted_developer%';
-- ^ should return ZERO rows (0007 removed these). If it returns rows,
-- migration 0007 hasn't been applied yet.

select indexname from pg_indexes
where tablename = 'branches' and indexname = 'branches_branch_code_unique_active';
-- ^ should return ONE row. If empty, migration 0008 hasn't been applied yet.
