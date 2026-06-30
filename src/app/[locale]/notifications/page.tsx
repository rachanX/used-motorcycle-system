import { getTranslations } from 'next-intl/server';
import { isPowerUser } from '@/lib/auth/roles';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import NotificationList from './notification-list';

export default async function NotificationsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  // Auto-generate due/overdue notifications on every page load.
  // The function uses a per-payment per-day dedup check so calling it multiple
  // times in a day is safe. Using adminClient so the security-definer function
  // has the privileges it needs even when called by a staff user.
  try {
    await adminClient().rpc('generate_due_notifications');
  } catch {
    // Non-fatal — proceed to show existing notifications even if generation fails.
  }

  let query = supabase
    .from('notifications')
    .select('*, contracts(contract_number)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!isPowerUser(me?.role) && me?.branch_id) {
    query = query.eq('branch_id', me.branch_id);
  }
  if (sp.type) query = query.eq('type', sp.type as import('@/types/database.types').NotificationType);

  const { data: notifications, error } = await query;
  const t = await getTranslations('notifications');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
      </div>

      <NotificationList
        locale={locale}
        notifications={(notifications ?? []) as any}
        currentType={sp.type ?? ''}
      />

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}
