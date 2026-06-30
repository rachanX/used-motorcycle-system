'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Search, ChevronLeft, ChevronRight, ArrowRight, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/confirm-modal';
import { softDeleteContractAction } from '@/lib/supabase/contract-actions';
import type { Contract } from '@/types/database.types';

type ContractRow = Contract & {
  customers: { first_name: string; last_name: string; phone_number: string } | null;
  vehicles: { brand: string; model: string; license_plate: string | null; stock_code: string } | null;
};

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

export default function ContractTable({
  locale,
  contracts,
  isDeveloper,
  page,
  totalPages,
  currentQuery,
  currentStatus
}: {
  locale: string;
  contracts: ContractRow[];
  isDeveloper: boolean;
  page: number;
  totalPages: number;
  currentQuery: string;
  currentStatus: string;
}) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);
  const [deleting, setDeleting] = useState<ContractRow | null>(null);
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
          {Object.entries(STATUS_KEYS).map(([val, key]) => (
            <option key={val} value={val}>{t(key)}</option>
          ))}
        </select>

        <Link
          href={`/${locale}/contracts/new`}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          {t('createContract')}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{t('contractNumber')}</th>
              <th className="px-4 py-3 font-medium">{t('customer')}</th>
              <th className="px-4 py-3 font-medium">{t('vehicle')}</th>
              <th className="px-4 py-3 font-medium">{t('monthlyInstallment')}</th>
              <th className="px-4 py-3 font-medium">{t('status')}</th>
              <th className="px-4 py-3 font-medium text-right">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">{t('noContracts')}</td>
              </tr>
            )}
            {contracts.map((c) => (
              <tr key={c.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.contract_number}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">
                  {c.customers ? `${c.customers.first_name} ${c.customers.last_name}` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {c.vehicles ? `${c.vehicles.brand} ${c.vehicles.model}` : '—'}
                  {c.vehicles?.license_plate && (
                    <span className="text-slate-400"> · {c.vehicles.license_plate}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{fmtMoney(c.monthly_installment)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                    {t(STATUS_KEYS[c.status])}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-3">
                    <Link
                      href={`/${locale}/contracts/${c.id}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {t('viewDetails')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    {isDeveloper && c.status !== 'active' && (
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
              await softDeleteContractAction(locale, deleting.id);
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
