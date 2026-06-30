'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, ChevronLeft, ChevronRight, ArrowRight, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/confirm-modal';
import { softDeleteContractAction } from '@/lib/supabase/contract-actions';
import type { ContractPaymentSummary } from '@/types/database.types';

const STATUS_KEYS: Record<string, string> = {
  active: 'statusActive',
  completed: 'statusCompleted',
  overdue: 'statusOverdue',
  cancelled: 'statusCancelled'
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800'
};

export default function ContractSummaryTable({
  locale,
  contracts,
  isDeveloper,
  page,
  totalPages,
  currentQuery,
  currentStatus,
  currentDue
}: {
  locale: string;
  contracts: ContractPaymentSummary[];
  isDeveloper: boolean;
  page: number;
  totalPages: number;
  currentQuery: string;
  currentStatus: string;
  currentDue: string;
}) {
  const tp = useTranslations('payments');
  const tCon = useTranslations('contracts');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);
  const [deleting, setDeleting] = useState<ContractPaymentSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function updateParams(next: Record<string, string>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    if (resetPage) params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function fmtMoney(n: number) {
    return n.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateParams({ q })}
            onBlur={() => updateParams({ q })}
            placeholder={tp('searchPlaceholder')}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={currentStatus}
          onChange={(e) => updateParams({ status: e.target.value })}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="">{tp('allStatus')}</option>
          {Object.entries(STATUS_KEYS).map(([val, key]) => (
            <option key={val} value={val}>{tCon(key)}</option>
          ))}
        </select>

        <button
          onClick={() => updateParams({ due: currentDue === 'overdue' ? '' : 'overdue' })}
          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
            currentDue === 'overdue'
              ? 'bg-red-600 border-red-600 text-white'
              : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {tp('filterOverdueOnly')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{tp('contractNumber')}</th>
              <th className="px-4 py-3 font-medium">{tp('customer')}</th>
              <th className="px-4 py-3 font-medium">{tCon('vehicle')}</th>
              <th className="px-4 py-3 font-medium">{tp('installmentsHeader')}</th>
              <th className="px-4 py-3 font-medium">{tp('remainingBalance')}</th>
              <th className="px-4 py-3 font-medium">{tCon('status')}</th>
              <th className="px-4 py-3 font-medium text-right">{tp('viewDetails')}</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">{tp('noContracts')}</td>
              </tr>
            )}
            {contracts.map((c) => (
              <tr key={c.contract_id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.contract_number}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.brand} {c.model}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {c.paid_terms}/{c.total_terms}
                  {c.has_overdue && (
                    <span className="ml-2 inline-flex rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-medium">
                      {tp('daysOverdue', { days: c.max_days_overdue })}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{fmtMoney(c.outstanding_balance)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.contract_status]}`}>
                    {tCon(STATUS_KEYS[c.contract_status])}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-3">
                    <Link
                      href={`/${locale}/payments/${c.contract_id}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {tp('viewDetails')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {isDeveloper && (
                      <button
                        onClick={() => setDeleting(c)}
                        className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {tc('delete')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {deleting && (
        <ConfirmModal
          message={tc('confirmDeleteMessage')}
          onConfirm={async () => {
            try {
              await softDeleteContractAction(locale, deleting.contract_id);
              router.refresh();
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
