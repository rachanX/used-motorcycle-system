'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Search, Trash2 } from 'lucide-react';
import BranchFormModal from './branch-form-modal';
import ConfirmModal from '@/components/confirm-modal';
import { softDeleteBranchAction } from '@/lib/supabase/branch-actions';
import type { Branch } from '@/types/database.types';

type BranchWithCount = Branch & { vehicles: { count: number }[] };

export default function BranchTable({
  locale,
  branches,
  soldByBranch,
  financeByBranch,
  isDeveloper,
  currentQuery,
  currentStatus
}: {
  locale: string;
  branches: BranchWithCount[];
  soldByBranch: Record<string, number>;
  financeByBranch: Record<string, number>;
  isDeveloper: boolean;
  currentQuery: string;
  currentStatus: string;
}) {
  const t = useTranslations('branches');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
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
          value={currentStatus}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="">{t('allStatus')}</option>
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
        </select>

        {isDeveloper && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
          >
            <Plus className="h-4 w-4" />
            {t('addBranch')}
          </button>
        )}
      </div>

      {!isDeveloper && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">{t('developerOnlyWrite')}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {branches.length === 0 && (
          <p className="col-span-full text-center text-slate-400 py-8">{t('noBranches')}</p>
        )}
        {branches.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-mono text-slate-400">{b.branch_code}</p>
                <h3 className="font-semibold text-slate-900 dark:text-white">{b.branch_name}</h3>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  b.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {b.status === 'active' ? t('active') : t('inactive')}
              </span>
            </div>

            {b.address && <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{b.address}</p>}
            {b.phone_number && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{b.phone_number}</p>}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {t('vehicleCount')}: {b.vehicles?.[0]?.count ?? 0}
                </span>
                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                  {locale === 'th' ? 'ขายสด' : 'Sold'}: {soldByBranch[b.id] ?? 0}
                </span>
                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {locale === 'th' ? 'ขายไฟเเนนซ์' : 'Finance'}: {financeByBranch[b.id] ?? 0}
                </span>
              </div>
              {isDeveloper && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditing(b)}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {tc('edit')}
                  </button>
                  <button
                    onClick={() => setDeleting(b)}
                    className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {tc('delete')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {adding && <BranchFormModal locale={locale} mode="create" onClose={() => setAdding(false)} />}
      {editing && (
        <BranchFormModal locale={locale} mode="edit" branch={editing} onClose={() => setEditing(null)} />
      )}

      {deleting && (
        <ConfirmModal
          message={tc('confirmDeleteMessage')}
          onConfirm={async () => {
            try {
              await softDeleteBranchAction(locale, deleting.id);
            } catch (e) {
              setDeleteError(e instanceof Error ? e.message : 'error');
              throw e;
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}
      {deleteError && (
        <div className="fixed bottom-4 right-4 z-[70] rounded-lg bg-red-600 text-white text-sm px-4 py-2 shadow-lg">
          {deleteError}
          <button className="ml-3 underline" onClick={() => setDeleteError(null)}>×</button>
        </div>
      )}
    </div>
  );
}
