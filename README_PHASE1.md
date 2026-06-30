# Used Car Management System — Phase 1: Database Schema + Supabase Setup

## Folder structure (project root so far)

```
used-car-system/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql                  # tables, enums, indexes
│   │   ├── 0002_functions_triggers_views.sql # business logic
│   │   └── 0003_rls_policies.sql            # access control
│   └── seed.sql                              # dev-only sample data
└── src/
    └── types/
        └── database.types.ts                 # TS types matching the schema
```
This will grow in later phases into the full Next.js app (`src/app`, `src/components`, `src/lib`, etc).

## What's in this phase

**Tables:** `users`, `branches`, `vehicles`, `customers`, `contracts`, `payments`, `notifications`, `audit_logs`

**Automatic behavior (triggers/functions), already wired up:**
- Creating a `contract` auto-generates all its `payments` rows (pinned to `due_day`, clamped to short months).
- Updating a `payment`'s `amount_paid` auto-recalculates its `status` (paid/pending/overdue).
- Payment status changes roll up to the parent `contract.status` (active → overdue → completed), and mark the `vehicle` `closed_contract` when fully paid.
- Every insert/update/delete on `vehicles`, `customers`, `contracts`, `payments` writes an `audit_logs` row automatically (old value, new value, user, timestamp) — no application code required.
- `generate_due_notifications()` — call this once a day via a scheduled job (see below) to populate the `notifications` table for due/overdue installments.

**Views:**
- `v_dashboard_summary` — per-branch counts for Module 7.
- `v_overdue_customers` — flattened overdue list for Module 6.

**Function:** `get_contract_summary(contract_id)` — remaining balance, next due date, days overdue, etc. for Module 4/5.

**Security:** RLS is enabled on every table.
- `developer` → unrestricted read/write/delete everywhere, including `audit_logs`.
- `staff` → read/write scoped to their own `branch_id`; cannot delete vehicles/customers/contracts/payments (delete policies exist for developer only); **zero access to `audit_logs`** (no select policy exists for non-developers, so Postgres denies by default).

This matches the spec exactly: 2 roles, audit logs invisible to staff, staff cannot delete important records.

## Setting this up (free tier, ~10 minutes)

1. **Create a Supabase project** (free tier) at supabase.com → New Project.
2. Install the CLI locally and link it:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   ```
3. **Push the schema:**
   ```bash
   supabase db push
   ```
   This runs all three migrations in `supabase/migrations/` in order.
4. **(Optional, local dev only) seed sample branches:**
   ```bash
   psql "$(supabase db url)" -f supabase/seed.sql
   ```
5. **Regenerate types** any time the schema changes (keeps `database.types.ts` authoritative):
   ```bash
   supabase gen types typescript --linked > src/types/database.types.ts
   ```

## Scheduling `generate_due_notifications()` for free

Supabase's free tier doesn't include paid Edge Function cron, but you have two $0 options:
- **pg_cron** (enabled on Supabase free tier): in the SQL editor run
  ```sql
  select cron.schedule('daily-notifications', '0 7 * * *',
    $$select public.generate_due_notifications();$$);
  ```
  This runs daily at 07:00 UTC inside the database itself — no external service needed.
- Alternative: a free GitHub Actions scheduled workflow that calls a Supabase Edge Function or RPC once a day.

## Backup strategy (free)

- **Built-in:** Supabase free tier retains automatic daily backups for ~7 days (point-in-time recovery is a paid add-on, so don't rely on it).
- **Recommended extra layer (zero cost):** a GitHub Actions workflow on a daily cron that runs `pg_dump` against the database (via `supabase db dump`) and commits/uploads the `.sql` file as a workflow artifact or pushes it to a private GitHub repo. Example job:
  ```yaml
  - run: supabase db dump --linked -f backup-$(date +%F).sql
  - uses: actions/upload-artifact@v4
    with: { name: db-backup, path: backup-*.sql }
  ```
- **Restore procedure:** `psql "$DATABASE_URL" -f backup-YYYY-MM-DD.sql` against a fresh Supabase project, or `supabase db reset` + replay migrations + restore data via `pg_restore`/`psql`.

## Notes on scale (50k customers / 10k vehicles / 500k+ payments)

- Every foreign key has a supporting index; `payments` has a partial index on `(due_date) where status in ('pending','overdue')` since that's the hot path for dashboards and notifications.
- Trigram (`pg_trgm`) GIN indexes on vehicles/customers power fast `ILIKE`-style search without a separate search service.
- All list endpoints in later phases will use keyset/offset pagination against these indexes — no full table scans.

## Next: Phase 2 — Authentication + User Management

Phase 2 will add: Supabase Auth wiring, the `handle_new_user()` trigger to auto-provision `public.users` rows on sign-up/invite, the Next.js auth routes/middleware, and the developer-only "Manage Users" screen.

Say "continue with Phase 2" whenever you're ready, and I'll build it the same way — full SQL/code, ready to run.
