import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/supabase/server';
import { queryNotificationHistory } from '@/lib/notifications/history';
import HistoryTable from './history-table';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 30;

export default async function NotificationHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; status?: string; q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const me = await getCurrentAppUser();

  // Developer-only (middleware also blocks this path for non-developers).
  if (!me || me.role !== 'developer') {
    redirect(`/${locale}/dashboard`);
  }

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const { rows, count } = await queryNotificationHistory({
    from: sp.from || undefined,
    to: sp.to || undefined,
    status: sp.status || undefined,
    q: sp.q || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <HistoryTable
      locale={locale}
      rows={rows}
      page={page}
      totalPages={totalPages}
      total={count}
      filters={{ from: sp.from ?? '', to: sp.to ?? '', status: sp.status ?? '', q: sp.q ?? '' }}
    />
  );
}
