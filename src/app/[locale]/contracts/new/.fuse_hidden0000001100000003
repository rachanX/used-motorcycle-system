import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import NewContractForm from './new-contract-form';

export default async function NewContractPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ customer_id?: string; vehicle_id?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations('contracts');
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  const branchFilter = me?.role === 'developer' ? null : me?.branch_id;

  let customerQuery = supabase
    .from('customers')
    .select('id, first_name, last_name, phone_number')
    .order('first_name');
  let vehicleQuery = supabase
    .from('vehicles')
    .select('id, stock_code, brand, model, year, selling_price, branch_id')
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (branchFilter) {
    customerQuery = customerQuery.eq('branch_id', branchFilter);
    vehicleQuery = vehicleQuery.eq('branch_id', branchFilter);
  }

  const [{ data: customers }, { data: vehicles }, { data: branches }] = await Promise.all([
    customerQuery,
    vehicleQuery,
    supabase.from('branches').select('id, branch_name').eq('status', 'active').is('deleted_at', null).order('branch_name')
  ]);

  return (
    <div>
      <Link
        href={`/${locale}/contracts`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('title')}
      </Link>

      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">{t('createContract')}</h1>

      <NewContractForm
        locale={locale}
        customers={customers ?? []}
        vehicles={vehicles ?? []}
        branches={branches ?? []}
        defaultBranchId={branchFilter ?? null}
        preselectedCustomerId={sp.customer_id}
        preselectedVehicleId={sp.vehicle_id}
      />
    </div>
  );
}
