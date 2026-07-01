import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import InstallmentTableClient from './installment-table-client';

export default async function InstallmentsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('installments');
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  // Flat list: active contracts only (status = 'active' | 'overdue')
  let query = supabase
    .from('contracts')
    .select(`
      id, contract_number, sale_price, monthly_installment, start_date, status,
      customers(first_name, last_name, phone_number),
      vehicles(brand, model, stock_code)
    `)
    .in('status', ['active', 'overdue'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (me?.role !== 'developer' && me?.branch_id) {
    query = query.eq('branch_id', me.branch_id);
  }

  const { data: contracts } = await query;

  const filtered = (contracts ?? []).filter((c: any) => {
    if (!sp.q) return true;
    const q = sp.q.toLowerCase();
    const cust = c.customers;
    return (
      c.contract_number?.toLowerCase().includes(q) ||
      cust?.first_name?.toLowerCase().includes(q) ||
      cust?.last_name?.toLowerCase().includes(q) ||
      cust?.phone_number?.includes(q)
    );
  });

  const isDeveloper = me?.role === 'developer';

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/installments/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          + {t('addContract')}
        </Link>
      </div>

      <div className="mb-4">
        <form method="get">
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder={locale === 'th' ? 'ค้นหาชื่อลูกค้า, เลขสัญญา, เบอร์โทร' : 'Search customer, contract number, phone'}
            className="w-full max-w-md rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>

      <InstallmentTableClient
        locale={locale}
        contracts={filtered as any}
        isDeveloper={isDeveloper}
      />
    </div>
  );
}
