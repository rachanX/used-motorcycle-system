/**
 * Role capability helpers.
 *
 * The app has two roles: 'developer' and 'staff'. Per product decision,
 * staff has the SAME data powers as a developer (view all branches,
 * create/edit/delete vehicles, customers, contracts, payments, branches).
 *
 * The ONLY things reserved for developers are the three admin areas:
 * Manage Users, Audit Logs, and Settings.
 *
 * - isPowerUser(): full data access. Use for data tables/actions and to
 *   decide whether to branch-scope queries.
 * - isAdmin(): developer-only. Use ONLY for Manage Users, Audit Logs,
 *   and Settings.
 */
export function isPowerUser(role?: string | null): boolean {
  return role === 'developer' || role === 'staff';
}

export function isAdmin(role?: string | null): boolean {
  return role === 'developer';
}
