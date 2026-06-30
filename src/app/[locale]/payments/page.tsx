import { getTranslations } from 'next-intl/server';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import ContractSummaryTable from './contract-summary-table';

const PAGE_SIZE = 20;

export default async function PaymentsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; due?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Layer 1: one row per contract (not per installment) — pulls from
  // v_contract_payment_summary (Phase 10 migration), which aggregates
  // each contract's payments at the database level.
  let query = supabase
    .from('v_contract_payment_summary')
    .select('*', { count: 'exact' })
    .order('contract_number', { ascending: false })
    .range(from, to);

  if (me?.role !== 'developer' && me?.branch_id) {
    query = query.eq('branch_id', me.branch_id);
  }
  if (sp.status) query = query.eq('contract_status', sp.status as import('@/types/database.types').ContractStatus);
  if (sp.due === 'overdue') query = query.gt('max_days_overdue', 0);
  if (sp.q) {
    const term = sp.q.replace(/[%]/g, '');
    query = query.or(
      `contract_number.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%`
    );
  }

  const { data: contracts, count, error } = await query;
  const t = await getTranslations('payments');
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
      </div>

      <ContractSummaryTable
        locale={locale}
        contracts={(contracts ?? []) as any}
        isDeveloper={me?.role === 'developer'}
        page={page}
        totalPages={totalPages}
        currentQuery={sp.q ?? ''}
        currentStatus={sp.status ?? ''}
        currentDue={sp.due ?? ''}
      />

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}
