'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Search, ChevronLeft, ChevronRight, ArrowRight, Trash2 } from 'lucide-react';
import CustomerFormModal from './customer-form-modal';
import ConfirmModal from '@/components/confirm-modal';
import { softDeleteCustomerAction } from '@/lib/supabase/customer-actions';
import type { Customer } from '@/types/database.types';

export default function CustomerTable({
  locale,
  customers,
  branches,
  defaultBranchId,
  isDeveloper,
  page,
  totalPages,
  currentQuery
}: {
  locale: string;
  customers: Customer[];
  branches: { id: string; branch_name: string }[];
  defaultBranchId: string | null;
  isDeveloper: boolean;
  page: number;
  totalPages: number;
  currentQuery: string;
}) {
  const t = useTranslations('customers');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);
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

        <button
          onClick={() => setAdding(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          {t('addCustomer')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{t('fullName')}</th>
              <th className="px-4 py-3 font-medium">{t('phoneNumber')}</th>
              <th className="px-4 py-3 font-medium">{t('nationalId')}</th>
              <th className="px-4 py-3 font-medium">{t('province')}</th>
              <th className="px-4 py-3 font-medium text-right">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">{t('noCustomers')}</td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 text-slate-900 dark:text-white">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.phone_number}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.national_id || '—'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{c.province || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-3">
                    <Link
                      href={`/${locale}/customers/${c.id}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {t('viewProfile')}
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

      {adding && (
        <CustomerFormModal
          locale={locale}
          mode="create"
          branches={branches}
          defaultBranchId={defaultBranchId}
          onClose={() => setAdding(false)}
        />
      )}

      {deleting && (
        <ConfirmModal
          message={tc('confirmDeleteMessage')}
          onConfirm={async () => {
            try {
              await softDeleteCustomerAction(locale, deleting.id);
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
