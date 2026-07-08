'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Search, ChevronLeft, ChevronRight, Trash2, Tag } from 'lucide-react';
import VehicleFormModal from './vehicle-form-modal';
import ConfirmModal from '@/components/confirm-modal';
import { softDeleteVehicleAction, markVehicleSoldAction } from '@/lib/supabase/vehicle-actions';
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
  available: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  reserved: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  financing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  sold_cash: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  closed_contract: 'bg-slate-200 text-slate-500 dark:bg-slate-800',
  under_repair: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
};

// Distinct badge colors per branch (avoids the status green/red/yellow).
const BRANCH_COLORS: string[] = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
];
const BRANCH_FALLBACK = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

export default function VehicleTable({
  locale,
  vehicles,
  branches,
  suppliers,
  prefixes,
  nextByPrefix,
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
  nextByPrefix?: Record<string, number>;
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
  const [sellingRow, setSellingRow] = useState<VehicleWithBranch | null>(null);

  const branchColor: Record<string, string> = {};
  branches.forEach((b, i) => { branchColor[b.id] = BRANCH_COLORS[i % BRANCH_COLORS.length]; });

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
              <th className="px-4 py-3 font-medium">{t('color')}</th>
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
                <td colSpan={11} className="px-4 py-10 text-center text-slate-400">{t('noVehicles')}</td>
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
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.color || '—'}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{fmtMoney(v.purchase_price ?? 0)}</td>
                <td className="px-4 py-3">
                  {(v.repair_cost ?? 0) === 0 ? (
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                      {fmtMoney(0)}
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300">{fmtMoney(v.repair_cost ?? 0)}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{fmtMoney((v.purchase_price ?? 0) + (v.repair_cost ?? 0))}</td>
                <td className="px-4 py-3">
                  {v.branches?.branch_name ? (
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${(v.branch_id && branchColor[v.branch_id]) || BRANCH_FALLBACK}`}>
                      {v.branches.branch_name}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[v.status]}`}>
                    {t(STATUS_KEYS[v.status])}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-3">
                    <button
                      onClick={() => setSellingRow(v)}
                      className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {locale === 'th' ? 'ขาย' : 'Sold'}
                    </button>
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
          nextByPrefix={nextByPrefix}
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
          nextByPrefix={nextByPrefix}
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
      {sellingRow && (
        <SoldModal
          locale={locale}
          vehicle={sellingRow}
          onClose={() => { setSellingRow(null); router.refresh(); }}
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

function SoldModal({ locale, vehicle, onClose }: { locale: string; vehicle: any; onClose: () => void }) {
  const isThai = locale === 'th';
  const L = (th: string, en: string) => (isThai ? th : en);
  const [price, setPrice] = useState<string>(vehicle.selling_price ? String(vehicle.selling_price) : '');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const n = Number(price);
    if (!n || n <= 0) { setErr(L('กรุณากรอกราคาขายให้ถูกต้อง', 'Please enter a valid selling price')); return; }
    setPending(true); setErr(null);
    const res = await markVehicleSoldAction(locale, vehicle.id, n);
    setPending(false);
    if (res?.error) { setErr(res.error); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-semibold text-slate-900 dark:text-white mb-1">{L('บันทึกการขาย', 'Mark as Sold')}</h2>
        <p className="text-xs text-slate-500 mb-4 font-mono">{vehicle.stock_code} · {vehicle.brand} {vehicle.model}</p>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{L('ราคาขาย', 'Selling Price')}</label>
        <input
          type="number" min={0} step="0.01" value={price} autoFocus
          onChange={e => setPrice(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          className="input"
        />
        {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
            {L('ยกเลิก', 'Cancel')}
          </button>
          <button onClick={submit} disabled={pending} className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
            {pending ? L('กำลังบันทึก…', 'Saving…') : L('ยืนยันการขาย', 'Confirm Sold')}
          </button>
        </div>
      </div>
    </div>
  );
}
