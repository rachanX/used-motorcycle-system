import Link from 'next/link';
import { isPowerUser } from '@/lib/auth/roles';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import PaymentDetailClient from './payment-detail-client';

export default async function PaymentContractDetailPage({
  params
}: {
  params: Promise<{ locale: string; contractId: string }>;
}) {
  const { locale, contractId } = await params;
  const t = await getTranslations('payments');
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from('contracts')
    .select('*, customers(*), vehicles(brand, model, stock_code, engine_number, vin_number, license_plate, color, actual_cost), payments(*)')
    .eq('id', contractId)
    .is('deleted_at', null)
    .single();

  if (!contract) notFound();
  if (!isPowerUser(me?.role) && contract.branch_id !== me?.branch_id) notFound();

  const { data: branches } = await supabase
    .from('branches')
    .select('id, branch_name')
    .eq('status', 'active')
    .is('deleted_at', null);

  const sortedPayments = [...(contract.payments ?? [])].sort(
    (a: any, b: any) => (a.installment_number ?? 0) - (b.installment_number ?? 0)
  );

  return (
    <div>
      <Link
        href={`/${locale}/payments`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToList')}
      </Link>
      <PaymentDetailClient
        locale={locale}
        contract={contract as any}
        payments={sortedPayments as any}
        branches={branches ?? []}
      />
    </div>
  );
}
