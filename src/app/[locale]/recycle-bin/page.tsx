import { redirect } from 'next/navigation';
import { isPowerUser } from '@/lib/auth/roles';
import { getCurrentAppUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import RecycleBinClient, { type RecycleItem } from './recycle-bin-client';

export const dynamic = 'force-dynamic';

export default async function RecycleBinPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const me = await getCurrentAppUser();
  if (!me || !isPowerUser(me.role)) redirect(`/${locale}/dashboard`);

  const admin = adminClient();
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: vehicles }, { data: contracts }, { data: customers }] = await Promise.all([
    admin.from('vehicles')
      .select('id, stock_code, brand, model, deleted_at')
      .not('deleted_at', 'is', null).gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false }),
    admin.from('contracts')
      .select('id, contract_number, deleted_at, customers(first_name, last_name)')
      .not('deleted_at', 'is', null).gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false }),
    admin.from('customers')
      .select('id, first_name, last_name, phone_number, deleted_at')
      .not('deleted_at', 'is', null).gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false }),
  ]);

  const items: RecycleItem[] = [
    ...((vehicles ?? []) as any[]).map((v) => ({
      kind: 'vehicle' as const,
      id: v.id,
      title: v.stock_code ?? '—',
      subtitle: [v.brand, v.model].filter(Boolean).join(' '),
      deletedAt: v.deleted_at as string,
    })),
    ...((contracts ?? []) as any[]).map((c) => ({
      kind: 'contract' as const,
      id: c.id,
      title: c.contract_number ?? '—',
      subtitle: c.customers ? `${c.customers.first_name ?? ''} ${c.customers.last_name ?? ''}`.trim() : '',
      deletedAt: c.deleted_at as string,
    })),
    ...((customers ?? []) as any[]).map((c) => ({
      kind: 'customer' as const,
      id: c.id,
      title: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—',
      subtitle: c.phone_number ?? '',
      deletedAt: c.deleted_at as string,
    })),
  ].sort((a, b) => (a.deletedAt < b.deletedAt ? 1 : -1));

  return <RecycleBinClient locale={locale} items={items} />;
}
