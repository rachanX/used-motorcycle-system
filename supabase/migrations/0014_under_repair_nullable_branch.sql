-- =====================================================================
-- Migration 0014: Allow under_repair vehicles to have null branch_id
-- =====================================================================
-- Previously branch_id was NOT NULL on vehicles, blocking the workflow
-- where a motorcycle enters the system in repair state before being
-- assigned to a selling branch.
-- =====================================================================

-- 1. Drop the NOT NULL constraint on vehicles.branch_id
alter table public.vehicles
  alter column branch_id drop not null;

-- 2. Update RLS SELECT: staff also sees under_repair vehicles with no branch yet
drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles
  for select using (
    is_developer()
    or branch_id = current_branch_id()
    or (branch_id is null and status = 'under_repair' and deleted_at is null)
  );

-- 3. Update RLS INSERT: staff can insert under_repair vehicles with no branch
drop policy if exists vehicles_insert on public.vehicles;
create policy vehicles_insert on public.vehicles
  for insert with check (
    is_developer()
    or branch_id = current_branch_id()
    or (branch_id is null and status = 'under_repair')
  );

-- 4. Update RLS UPDATE: staff can update if they own the branch or it was unassigned under_repair
drop policy if exists vehicles_update on public.vehicles;
create policy vehicles_update on public.vehicles
  for update using (
    is_developer()
    or branch_id = current_branch_id()
    or (branch_id is null and status = 'under_repair')
  );
