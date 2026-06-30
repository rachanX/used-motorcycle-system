-- Run this and paste the full output back to me.
-- This shows EXACTLY what RLS policies currently exist on your live
-- database for branches and vehicles (the ground truth, regardless of
-- which migrations you think you've run).

select tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('branches', 'vehicles')
order by tablename, cmd, policyname;
