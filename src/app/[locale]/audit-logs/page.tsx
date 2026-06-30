import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import AuditLogTable from './audit-log-table';

const PAGE_SIZE = 30;
const TABLES = ['vehicles', 'customers', 'contracts', 'payments', 'auth.users'];

export default async function AuditLogsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ action?: string; table?: string; q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const me = await getCurrentAppUser();

  // Hard guard: redirect + RLS both deny staff. Even if the audit_logs
  // table were queried directly, RLS returns zero rows for non-developers.
  if (!me || me.role !== 'developer') {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations('auditLogs');
  const supabase = await createClient();

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('audit_logs')
    .select('*, users(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (sp.action) query = query.eq('action', sp.action as import('@/types/database.types').AuditAction);
  if (sp.table) query = query.eq('table_name', sp.table);
  if (sp.q) query = query.ilike('record_id', `%${sp.q.replace(/[%]/g, '')}%`);

  const { data: logs, count, error } = await query;
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
      </div>

      <AuditLogTable
        locale={locale}
        logs={(logs ?? []) as any}
        tables={TABLES}
        page={page}
        totalPages={totalPages}
        currentAction={sp.action ?? ''}
        currentTable={sp.table ?? ''}
        currentQuery={sp.q ?? ''}
      />

      {error && <p className="mt-4 text-sm text-red-600">{error.message}</p>}
    </div>
  );
}
