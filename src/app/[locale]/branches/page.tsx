import { getTranslations } from 'next-intl/server';
import { isPowerUser } from '@/lib/auth/roles';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import BranchTable from './branch-table';

export default async function BranchesPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { locale } = await params;
  const { q, status } = await searchParams;
  const t = await getTranslations('branches');
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  // Vehicle count per branch (for the "Vehicle Count" column) — single
  // aggregate query, scales fine even with 10,000+ vehicles thanks to
  // the idx_vehicles_branch index from Phase 1.
  let query = supabase
    .from('branches')
    .select('*, vehicles(count)')
    .is('deleted_at', null)
    .order('branch_name', { ascending: true });

  if (status === 'active' || status === 'inactive') {
    query = query.eq('status', status);
  }
  if (q) {
    query = query.or(`branch_name.ilike.%${q}%,branch_code.ilike.%${q}%`);
  }

  const { data: branches, error } = await query;

  // Sold (cash) vehicle count per branch, for the branch cards.
  const { data: soldRows } = await supabase
    .from('vehicles')
    .select('branch_id')
    .eq('status', 'sold_cash')
    .is('deleted_at', null);
  const soldByBranch: Record<string, number> = {};
  for (const r of (soldRows ?? []) as { branch_id: string | null }[]) {
    if (r.branch_id) soldByBranch[r.branch_id] = (soldByBranch[r.branch_id] ?? 0) + 1;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
      </div>

      <BranchTable
        locale={locale}
        branches={(branches ?? []) as any}
        soldByBranch={soldByBranch}
        isDeveloper={isPowerUser(me?.role)}
        currentQuery={q ?? ''}
        currentStatus={status ?? ''}
      />

      {error && (
        <p className="mt-4 text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
}
