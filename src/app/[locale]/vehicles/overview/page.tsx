import { getTranslations } from 'next-intl/server';
import { isPowerUser } from '@/lib/auth/roles';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import type { VehicleStatus } from '@/types/database.types';
import VehicleTable from '../vehicle-table';

const PAGE_SIZE = 20;

const SORT_MAP: Record<string, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  price_asc: { column: 'purchase_price', ascending: true },
  price_desc: { column: 'purchase_price', ascending: false },
  year_desc: { column: 'year', ascending: false },
  stock_asc: { column: 'stock_num', ascending: true },
  stock_desc: { column: 'stock_num', ascending: false }
};

export default async function VehiclesOverviewPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; branch?: string; sort?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('vehicles');
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const sort = SORT_MAP[sp.sort ?? 'newest'] ?? SORT_MAP.newest;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Overview: only available + under_repair
  const allowedStatuses: VehicleStatus[] = (sp.status
    ? [sp.status].filter(s => ['available','under_repair'].includes(s))
    : ['available','under_repair']) as VehicleStatus[];

  let query = supabase
    .from('vehicles')
    .select('*, branches(branch_name)', { count: 'exact' })
    .in('status', allowedStatuses)
    .is('deleted_at', null)
    .order(sort.column, { ascending: sort.ascending })
    .range(from, to);

  // Staff: show their branch's vehicles PLUS unassigned (null branch) ones.
  // Null-branch vehicles are always under_repair (available/reserved always have a branch),
  // so this is safe and avoids unsupported nested PostgREST and() syntax.
  if (!isPowerUser(me?.role) && me?.branch_id)
    query = query.or(`branch_id.eq.${me.branch_id},branch_id.is.null`);
  if (sp.branch) query = query.eq('branch_id', sp.branch);
  if (sp.q) {
    const term = sp.q.replace(/[%]/g, '');
    query = query.or(`stock_code.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,license_plate.ilike.%${term}%,vin_number.ilike.%${term}%`);
  }

  const [{ data: vehicles, count }, { data: branches }, { data: prefixRows }, { data: seqRows }] = await Promise.all([
    query,
    supabase.from('branches').select('id, branch_name').eq('status', 'active').is('deleted_at', null).order('branch_name'),
    supabase.from('stock_prefixes').select('prefix, label').eq('is_active', true).order('sort_order'),
    supabase.from('stock_sequences').select('prefix, last_seq')
  ]);
  const nextByPrefix: Record<string, number> = {};
  for (const r of (seqRows ?? []) as { prefix: string; last_seq: number }[]) nextByPrefix[r.prefix] = (r.last_seq ?? 0) + 1;

  const prefixes = (prefixRows ?? []) as { prefix: string; label: string }[];
  const suppliers: string[] = [];
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {locale === 'th' ? 'รถมอเตอร์ไซค์พร้อมขายและระหว่างซ่อม' : 'Available and under repair motorcycles'}
        </p>
      </div>
      <VehicleTable
        locale={locale}
        vehicles={(vehicles ?? []) as any}
        branches={branches ?? []}
        suppliers={suppliers}
        prefixes={prefixes}
        nextByPrefix={nextByPrefix}
        defaultBranchId={isPowerUser(me?.role) ? null : me?.branch_id ?? null}
        isDeveloper={isPowerUser(me?.role)}
        totalCount={count ?? 0}
        page={page}
        totalPages={totalPages}
        currentQuery={sp.q ?? ''}
        currentStatus={sp.status ?? ''}
 
        currentBranch={sp.branch ?? ''}
        currentSupplier={''}
        currentSort={sp.sort ?? 'newest'}
      />
    </div>
  );
}
