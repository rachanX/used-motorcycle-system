# Backend Code Review — Used Motorcycle Management System

_Reviewed: server actions (`src/lib/supabase/*`), auth, middleware, role helpers, and database RLS/functions (via Supabase advisors)._

## Overall

The backend is well-structured for a small app. It uses solid patterns: a clean split between the cookie-based server client, the browser client, and the service-role admin client; **defense-in-depth authorization** (an app-level `getCurrentAppUser()` check *plus* database RLS); Zod validation on most mutations; a self-demotion guard on user edits; UTC-safe date math for the payment schedule; and atomic stock-code generation via an RPC. The issues below are mostly hardening and consistency, not fundamental design flaws.

The single biggest theme: **many actions swallow database errors as a generic `'invalid'`**, which is exactly what made the recent "can't save contract" bug so hard to find. Fixing that class of issue will save you hours next time.

---

## High priority

### 1. Authorization trusts a client-supplied `branchId`
In the installment section-update actions (`updateContractInfoAction`, `updateBuyerInfoAction`, `updateGuarantorInfoAction`, `updateVehicleSnapshotAction`, `updateFinancialInfoAction`), the branch check is `assertBranchAccess(branchId)` where `branchId` comes in **as an argument from the client**, and the write then uses the service-role client (which bypasses RLS) against a client-supplied `contractId`.

A caller could pass their *own* branch id to pass the check while editing a contract that actually belongs to another branch. Today both roles are "power users" so the check always passes anyway, but this is a latent hole that would bite the moment you add a truly restricted role.

**Fix:** look up the record's real `branch_id` from the database and compare against `me.branch_id` — never trust a branch id passed from the browser.

### 2. `SECURITY DEFINER` views bypass RLS (advisor: ERROR)
`v_dashboard_summary`, `v_overdue_customers`, `v_contract_payment_summary`, and `v_sold_vehicles` are `SECURITY DEFINER` views. They run with the creator's privileges and **ignore row-level security**, so any signed-in user hitting `/rest/v1/v_dashboard_summary` directly can read *every* branch's data. The app code filters by branch in the query, but the API endpoint itself is unfiltered.

**Fix (Postgres 15+):** recreate each view `WITH (security_invoker = on)` so RLS applies to the querying user.

### 3. Generic `'invalid'` error handling hides real failures
`createInstallmentContractAction` and all five `update*InfoAction` functions return `{ error: 'invalid' }` on *any* database error. That's why the duplicate-active-contract failure looked like a mystery. `vehicle-actions.ts` (`mapDbError`) and `contract-actions.ts` (`23505 → oneActiveContractPerVehicle`) already do this right — apply the same pattern everywhere.

**Fix:** map common Postgres codes (`23505` unique, `23502` not-null, `23514` check) to specific messages, and log the raw error server-side.

---

## Medium priority

### 4. `createInstallmentContractAction` isn't atomic
It inserts a **new customer**, then inserts the **contract**. If the contract insert fails (as it did with the unique-constraint bug), the just-created customer is left orphaned — no rollback. The subsequent `vehicles` status update also isn't error-checked.

**Fix:** move the create into a single Postgres function/transaction, or clean up the customer on contract failure.

### 5. Harden `SECURITY DEFINER` functions (advisors: WARN)
- **Mutable `search_path`** on nearly every function (`is_developer`, `is_power_user`, `next_stock_code`, `handle_new_user`, etc.). This is a privilege-escalation vector. Add `SET search_path = public, pg_temp` to each (as `current_branch_id` already does).
- **Directly callable by `anon`/`authenticated`** via RPC: trigger-only functions (`audit_trigger_fn`, `handle_new_user`) and internal helpers (`next_stock_code`, `next_contract_sequence`, `generate_due_notifications`) shouldn't be publicly invokable. `REVOKE EXECUTE ... FROM anon, authenticated` on those. (`log_auth_event` is intentionally callable pre-login — that one's fine.)

### 6. Inconsistent validation style in `user-actions.ts`
`updateUserAction` uses `updateSchema.parse(...)` which **throws** on bad input (surfacing a 500), while `inviteUserAction` uses `safeParse` and returns a friendly error. Use `safeParse` in both.

### 7. `inviteUserAction` partial-state risk
It creates the auth user, then updates the `public.users` row. If the update fails you're left with an auth account whose profile has the wrong role/branch and no rollback. Consider deleting the auth user on profile-update failure, or doing both in one transaction.

---

## Low priority / polish

- **Naming drift:** `branch-actions.ts` still calls its guard `assertDeveloper()` and throws "developer role required", but it now checks `isPowerUser`. Rename to avoid confusion.
- **Env var assertions:** `process.env.X!` is used everywhere with no startup validation. The truncated-`SUPABASE_URL` incident is exactly what a small env-var check at boot would have caught instantly.
- **Enable leaked-password protection** in Supabase Auth settings (advisor WARN) — checks new passwords against HaveIBeenPwned.
- **`generatePaymentScheduleAction`** regenerates unpaid rows starting at `paidCount + 1`; if installments were ever paid out of order, `installment_number` could drift. Edge case, worth a note.
- **`pg_trgm` extension in `public` schema** (advisor WARN) — cosmetic; move to an `extensions` schema when convenient.

---

## What's already good (keep doing this)

- Defense-in-depth: app-level role check **and** RLS on the same operations.
- The new `is_power_user()` split cleanly keeps Manage Users / Audit Logs / Settings developer-only at the database level.
- Self-edit protection in `updateUserAction` (a developer can't demote or deactivate themselves) — with a clear "defense in depth" comment.
- UTC-based month arithmetic in the payment schedule avoids timezone/DST bugs.
- Atomic `next_stock_code` / `next_contract_sequence` RPCs instead of read-then-write races.
- `vehicle-actions.mapDbError` — the model the rest of the codebase should follow.

---

## Suggested order of work
1. Fix the generic `'invalid'` error mapping (#3) — cheap, high everyday value.
2. Fix client-supplied `branchId` authorization (#1).
3. Convert the four views to `security_invoker` (#2).
4. Add `search_path` + `REVOKE EXECUTE` on the DB functions (#5).
5. The atomicity and validation-consistency items (#4, #6, #7).
