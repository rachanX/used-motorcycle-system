import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '@/i18n/request';
import { notFound } from 'next/navigation';
import AppShell from '@/components/app-shell';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as (typeof locales)[number])) notFound();

  const messages = await getMessages();
  const appUser = await getCurrentAppUser();

  let recentNotifications: any[] = [];
  let unreadCount = 0;
  let prefixes: { prefix: string; label: string; count?: number }[] = [];

  if (appUser) {
    const supabase = await createClient();
    const [notifResult, prefixResult, stockResult] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, message, is_read, created_at', { count: 'exact' })
        .is('deleted_at', null)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('stock_prefixes')
        .select('prefix, label')
        .eq('is_active', true)
        .order('sort_order'),
      // In-stock vehicles (available or under repair) for the per-prefix counts.
      supabase
        .from('vehicles')
        .select('stock_prefix')
        .in('status', ['available', 'under_repair'])
        .is('deleted_at', null)
    ]);

    recentNotifications = notifResult.data ?? [];
    unreadCount = notifResult.count ?? 0;

    const countByPrefix: Record<string, number> = {};
    for (const v of (stockResult.data ?? []) as { stock_prefix: string | null }[]) {
      if (v.stock_prefix) countByPrefix[v.stock_prefix] = (countByPrefix[v.stock_prefix] ?? 0) + 1;
    }
    const basePrefixes = prefixResult.data ?? [
      { prefix: 'TS', label: 'TS' },
      { prefix: 'TV', label: 'TV' },
      { prefix: 'TM', label: 'TM' },
      { prefix: 'TAC', label: 'TAC' }
    ];
    prefixes = basePrefixes.map(p => ({ ...p, count: countByPrefix[p.prefix] ?? 0 }));
  }

  return (
    <NextIntlClientProvider messages={messages}>
      {appUser ? (
        <AppShell
          locale={locale}
          user={appUser}
          recentNotifications={recentNotifications}
          unreadCount={unreadCount}
          prefixes={prefixes}
        >
          {children}
        </AppShell>
      ) : (
        children
      )}
    </NextIntlClientProvider>
  );
}
