import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import CustomerProfileClient from './profile-client';

export default async function CustomerProfilePage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('customers');
  const supabase = await createClient();

  const [{ data: customer }, { data: contracts }, { data: branches }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase
      .from('contracts')
      .select('*, vehicles(brand, model, stock_code), payments(*)')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('branches').select('id, branch_name').eq('status', 'active').order('branch_name')
  ]);

  if (!customer) notFound();

  return (
    <div>
      <Link
        href={`/${locale}/customers`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToList')}
      </Link>

      <CustomerProfileClient
        locale={locale}
        customer={customer as any}
        contracts={(contracts ?? []) as any}
        branches={branches ?? []}
      />
    </div>
  );
}
