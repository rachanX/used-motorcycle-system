'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import type { AuditLog, AuditAction } from '@/types/database.types';

type LogRow = AuditLog & { users: { full_name: string; email: string } | null };

const ACTION_KEYS: Record<AuditAction, string> = {
  login: 'actionLogin',
  logout: 'actionLogout',
  failed_login: 'actionFailedLogin',
  create: 'actionCreate',
  update: 'actionUpdate',
  delete: 'actionDelete'
};

const ACTION_COLORS: Record<AuditAction, string> = {
  login: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  logout: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
  failed_login: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  create: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  update: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  delete: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200'
};

export default function AuditLogTable({
  locale,
  logs,
  tables,
  page,
  totalPages,
  currentAction,
  currentTable,
  currentQuery
}: {
  locale: string;
  logs: LogRow[];
  tables: string[];
  page: number;
  totalPages: number;
  currentAction: string;
  currentTable: string;
  currentQuery: string;
}) {
  const t = useTranslations('auditLogs');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);
  const [expanded, setExpanded] = useState<number | null>(null);

  function updateParams(next: Record<string, string>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    if (resetPage) params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateParams({ q })}
            onBlur={() => updateParams({ q })}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={currentAction}
          onChange={(e) => updateParams({ action: e.target.value })}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="">{t('allActions')}</option>
          {Object.entries(ACTION_KEYS).map(([val, key]) => (
            <option key={val} value={val}>{t(key)}</option>
          ))}
        </select>

        <select
          value={currentTable}
          onChange={(e) => updateParams({ table: e.target.value })}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="">{t('allTables')}</option>
          {tables.map((tbl) => (
            <option key={tbl} value={tbl}>{tbl}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {logs.length === 0 && (
          <p className="text-center text-slate-400 py-10">{t('noLogs')}</p>
        )}
        {logs.map((log) => {
          const isOpen = expanded === log.id;
          const hasDiff = log.old_value || log.new_value;
          return (
            <div key={log.id}>
              <button
                onClick={() => hasDiff && setExpanded(isOpen ? null : log.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${ACTION_COLORS[log.action]}`}>
                  {t(ACTION_KEYS[log.action])}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900 dark:text-white truncate">
                    {log.users?.full_name ?? t('unknownUser')}
                    {log.table_name && <span className="text-slate-400"> · {log.table_name}</span>}
                  </p>
                  {log.record_id && (
                    <p className="text-xs text-slate-400 font-mono truncate">{log.record_id}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400 shrink-0">
                  {new Date(log.created_at).toLocaleString(locale === 'th' ? 'th-TH' : 'en-US')}
                </span>
                {hasDiff && (
                  isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                )}
              </button>

              {isOpen && hasDiff && (
                <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {log.old_value && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">{t('oldValue')}</p>
                      <pre className="text-[11px] bg-slate-50 dark:bg-slate-950 rounded-lg p-2 overflow-x-auto text-slate-600 dark:text-slate-300">
                        {JSON.stringify(log.old_value, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.new_value && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">{t('newValue')}</p>
                      <pre className="text-[11px] bg-slate-50 dark:bg-slate-950 rounded-lg p-2 overflow-x-auto text-slate-600 dark:text-slate-300">
                        {JSON.stringify(log.new_value, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) }, false)}
            className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) }, false)}
            className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
