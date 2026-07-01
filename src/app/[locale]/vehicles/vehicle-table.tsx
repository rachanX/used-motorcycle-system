'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import VehicleFormModal from './vehicle-form-modal';
import ConfirmModal from '@/components/confirm-modal';
import { softDeleteVehicleAction } from '@/lib/supabase/vehicle-actions';
import type { Vehicle } from '@/types/database.types';

type VehicleWithBranch = Vehicle & { branches: { branch_name: string } | null };

const STATUS_KEYS: Record<string, string> = {
  available: 'statusAvailable',
  reserved: 'statusReserved',
  financing: 'statusFinancing',
  sold_cash: 'statusSoldCash',
  closed_contract: 'statusClosedContract',
  under_repair: 'statusUnderRepair'
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  reserved: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  financing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  sold_cash: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
  closed_contract: 'bg-slate-200 text-slate-500 dark:bg-slate-800',
  under_repair: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
};

export default function VehicleTable({
  locale,
  vehicles,
  branches,
  suppliers,
  prefixes,
  defaultBranchId,
  isDeveloper,
  totalCount,
  page,
  totalPages,
  currentQuery,
  currentStatus,
  currentBranch,
  currentSupplier,
  currentSort,
  statusOptions
}: {
  locale: string;
  vehicles: VehicleWithBranch[];
  branches: { id: string; branch_name: string }[];
  suppliers: string[];
  prefixes: { prefix: string; label: string }[];
  defaultBranchId: string | null;
  isDeveloper: boolean;
  totalCount: number;
  page: number;
  totalPages: number;
  currentQuery: string;
  currentStatus: string;
  currentBranch: string;
  currentSupplier: string;
  currentSort: string;
  statusOptions?: string[];
}) {
  const t = useTranslations('vehicles');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<VehicleWithBranch | null>(null);
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
          {Object.entries(STATUS_KEYS)
            .filter(([val]) => !statusOptions || statusOptions.includes(val))
            .map(([val, key]) => (
              <option key={val} value={val}>{t(key)}</option>
            ))}
        </select>

        <select
          value={currentBranch}
          onChange={(e) => updateParams({ branch: e.target.value })}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="">{t('allBranches')}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.branch_name}</option>
          ))}
        </select>

        {suppliers.length > 0 && (
          <select
            value={currentSupplier}
            onChange={(e) => updateParams({ supplier: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
          >
            <option value="">{t('allSuppliers')}</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <select
          value={currentSort}
          onChange={(e) => updateParams({ sort: e.target.value }, false)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="newest">{t('sortNewest')}</option>
          <option value="price_asc">{t('sortPriceLowHigh')}</option>
          <option value="price_desc">{t('sortPriceHighLow')}</option>
          <option value="year_desc">{t('sortYearNewOld')}</option>
          <option value="stock_asc">{locale === 'th' ? 'รหัสสต็อก: น้อย → มาก' : 'Stock code: Min → Max'}</option>
          <option value="stock_desc">{locale === 'th' ? 'รหัสสต็อก: มาก → น้อย' : 'Stock code: Max → Min'}</option>
        </select>

        <button
          onClick={() => setAdding(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          <Plus className="h-4 w-4" />
          {t('addVehicle')}
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-2">{t('totalResults', { count: totalCount })}</p>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{t('stockCode')}</th>
              <th className="px-4 py-3 font-medium">{t('brand')} / {t('model')}</th>
              <th className="px-4 py-3 font-medium">{t('year')}</th>
              <th className="px-4 py-3 font-medium">{t('licensePlate')}</th>
              <th className="px-4 py-3 font-medium">{t('purchasePrice')}</th>
              <th className="px-4 py-3 font-medium">{t('repairCost')}</th>
              <th className="px-4 py-3 font-medium">{t('actualCost')}</th>
              <th className="px-4 py-3 font-medium">{t('branch')}</th>
              <th className="px-4 py-3 font-medium">{t('status')}</th>
              <th className="px-4 py-3 font-medium text-right">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400">{t('noVehicles')}</td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {v.stock_code}
                  {v.supplier_company && (
                    <div className="mt-0.5 inline-flex rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {v.supplier_company}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">
                  {v.brand} {v.model}
                  {v.sub_model && <span className="text-slate-400"> · {v.sub_model}</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.year}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.license_plate || '—'}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{fmtMoney(v.purchase_price ?? 0)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmtMoney(v.repair_cost ?? 0)}</td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{fmtMoney((v.purchase_price ?? 0) + (v.repair_cost ?? 0))}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.branches?.branch_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[v.status]}`}>
                    {t(STATUS_KEYS[v.status])}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-3">
                    <button
                      onClick={() => setEditing(v)}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {tc('edit')}
                    </button>
                    {isDeveloper && (
                      <button
                        onClick={() => setDeleting(v)}
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
            {t('previous')}
          </button>
          <span className="text-sm text-slate-500">
            {t('page')} {page} {t('of')} {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) }, false)}
            className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 disabled:opacity-40"
          >
            {t('next')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {adding && (
        <VehicleFormModal
          locale={locale}
          mode="create"
          branches={branches}
          prefixes={prefixes}
          defaultBranchId={defaultBranchId}
          onClose={() => { setAdding(false); router.refresh(); }}
        />
      )}
      {editing && (
        <VehicleFormModal
          locale={locale}
          mode="edit"
          vehicle={editing}
          branches={branches}
          prefixes={prefixes}
          defaultBranchId={defaultBranchId}
          onClose={() => { setEditing(null); router.refresh(); }}
        />
      )}

      {deleting && (
        <ConfirmModal
          message={tc('confirmDeleteMessage')}
          onConfirm={async () => {
            try {
              await softDeleteVehicleAction(locale, deleting.id);
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
          <button className="ml-3 underline" onClick={() => setDeleteError(null)}>x</button>
        </div>
      )}
    </div>
  );
}
