-- 1. Confirm migration 0009 actually applied successfully (grants can
--    silently no-op or error depending on who ran the migration):
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'branches' and grantee = 'authenticated';
-- Expect to see SELECT, INSERT, UPDATE, DELETE all listed for 'authenticated'.
-- If UPDATE is missing, the grant didn't take and that IS the bug.

-- 2. Confirm the policy now has an explicit with_check (not NULL):
select policyname, cmd, qual, with_check
from pg_policies
where tablename = 'branches' and policyname = 'branches_update_developer';
-- with_check should now show "is_developer()", not NULL.

-- 3. Check if RLS is somehow forced (would block even table owners/grants):
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'branches';
-- relforcerowsecurity should be FALSE (we never enabled FORCE ROW LEVEL SECURITY).
