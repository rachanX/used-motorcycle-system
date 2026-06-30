import { getTranslations } from 'next-intl/server';
import { isPowerUser } from '@/lib/auth/roles';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import ContractTable from './contract-table';

const PAGE_SIZE = 20;

export default async function ContractsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('contracts')
    .select(
      '*, customers(first_name, last_name, phone_number), vehicles(brand, model, license_plate, stock_code)',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (sp.status) query = query.eq('status', sp.status as import('@/types/database.types').ContractStatus);
  if (sp.q) {
    const term = sp.q.replace(/[%]/g, '');
    query = query.ilike('contract_number', `%${term}%`);
  }

  const { data: contracts, count, error } = await query;
  const t = await getTranslations('contracts');
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
      </div>

      <ContractTable
        locale={locale}
        contracts={(contracts ?? []) as any}
        isDeveloper={isPowerUser(me?.role)}
        page={page}
        totalPages={totalPages}
        currentQuery={sp.q ?? ''}
        currentStatus={sp.status ?? ''}
      />

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}
