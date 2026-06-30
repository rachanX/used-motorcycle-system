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
  let prefixes: { prefix: string; label: string }[] = [];

  if (appUser) {
    const supabase = await createClient();
    const [notifResult, prefixResult] = await Promise.all([
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
        .order('sort_order')
    ]);

    recentNotifications = notifResult.data ?? [];
    unreadCount = notifResult.count ?? 0;
    prefixes = prefixResult.data ?? [
      { prefix: 'TS', label: 'TS' },
      { prefix: 'TV', label: 'TV' },
      { prefix: 'TM', label: 'TM' },
      { prefix: 'TAC', label: 'TAC' }
    ];
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
