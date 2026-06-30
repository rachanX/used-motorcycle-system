import { getTranslations } from 'next-intl/server';
import { isPowerUser } from '@/lib/auth/roles';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import SoldPageClient from './sold-client';

export default async function SoldVehiclesPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('sold');
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  let query = supabase
    .from('v_sold_vehicles')
    .select('*')
    .order('stock_code', { ascending: false });

  if (!isPowerUser(me?.role) && me?.branch_id) {
    query = query.eq('branch_id', me.branch_id);
  }

  if (sp.q) {
    const term = sp.q.replace(/[%]/g, '');
    query = query.or(
      `stock_code.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,license_plate.ilike.%${term}%,vin_number.ilike.%${term}%,engine_number.ilike.%${term}%`
    );
  }

  const { data: rows } = await query;

  const cashSales = (rows ?? []).filter((r: any) => r.status === 'sold_cash');
  const closedContracts = (rows ?? []).filter((r: any) => r.status === 'closed_contract');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
      </div>
      <SoldPageClient
        locale={locale}
        cashSales={cashSales as any}
        closedContracts={closedContracts as any}
        currentTab={sp.tab ?? 'cash'}
        currentQuery={sp.q ?? ''}
        isDeveloper={isPowerUser(me?.role)}
      />
    </div>
  );
}
