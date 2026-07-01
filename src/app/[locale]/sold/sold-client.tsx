'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Trash2, Eye } from 'lucide-react';
import { softDeleteVehicleAction } from '@/lib/supabase/vehicle-actions';

type SoldRow = {
  vehicle_id: string;
  stock_code: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string | null;
  engine_number: string | null;
  vin_number: string | null;
  purchase_price: number | null;
  repair_cost: number | null;
  actual_cost: number | null;
  color: string | null;
  selling_price: number | null;
  status: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  contract_number: string | null;
  sale_price: number | null;
  start_date: string | null;
  end_date: string | null;
  sub_model: string | null;
  registration_year: number | null;
  mileage: number | null;
  date_received: string | null;
  previous_owner: string | null;
  vehicle_source: string | null;
  received_registration_book: boolean | null;
  received_tax_invoice: boolean | null;
  registration_received_date: string | null;
};

export default function SoldPageClient({
  locale,
  cashSales,
  closedContracts,
  currentTab,
  currentQuery,
  prefixes,
  isDeveloper
}: {
  locale: string;
  cashSales: SoldRow[];
  closedContracts: SoldRow[];
  currentTab: string;
  currentQuery: string;
  prefixes: { prefix: string; label: string }[];
  isDeveloper: boolean;
}) {
  const t = useTranslations('sold');
  const tc = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(currentQuery);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [prefixFilter, setPrefixFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<SoldRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => v ? params.set(k, v) : params.delete(k));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function fmtMoney(n: number | null) {
    if (n == null) return '—';
    return Number(n).toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency', currency: 'THB', maximumFractionDigits: 0
    });
  }

  async function handleDelete(vehicleId: string) {
    if (!confirm(locale === 'th' ? 'ยืนยันการลบรายการนี้?' : 'Delete this record?')) return;
    setDeleting(vehicleId);
    setDeleteError(null);
    try {
      await softDeleteVehicleAction(locale, vehicleId);
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  const allRows = currentTab === 'cash' ? cashSales : closedContracts;
  const stockNum = (c: string | null) => parseInt((c ?? '').replace(/[^0-9]/g, ''), 10) || 0;
  const prefixOf = (c: string | null) => ((c ?? '').match(/^[A-Za-z]+/)?.[0] ?? '').toUpperCase();
  const rows = prefixFilter ? allRows.filter((r) => prefixOf(r.stock_code) === prefixFilter) : allRows;
  const sortedRows = [...rows].sort((a, b) =>
    sortDir === 'asc'
      ? stockNum(a.stock_code) - stockNum(b.stock_code)
      : stockNum(b.stock_code) - stockNum(a.stock_code)
  );
  const colSpan = currentTab === 'cash' ? 7 : 9;

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && updateParams({ q })}
          onBlur={() => updateParams({ q })}
          placeholder={locale === 'th'
            ? 'ค้นหา รหัสสต็อก, ชื่อ, ทะเบียน, เลขเครื่อง, เลขตัวถัง'
            : 'Search stock code, name, plate, engine, chassis'}
          className="w-full max-w-xl rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter + sort by stock code */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-slate-400">{locale === 'th' ? 'กรองรหัสสต็อก' : 'Filter stock code'}:</span>
        <select
          value={prefixFilter}
          onChange={(e) => setPrefixFilter(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="">{locale === 'th' ? 'ทั้งหมด' : 'All'}</option>
          {prefixes.map((p) => (
            <option key={p.prefix} value={p.prefix.toUpperCase()}>{p.label && p.label !== p.prefix ? `${p.prefix} — ${p.label}` : p.prefix}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-2">{locale === 'th' ? 'เรียงตามรหัสสต็อก' : 'Sort by stock code'}:</span>
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="asc">{locale === 'th' ? 'น้อย → มาก' : 'Min → Max'}</option>
          <option value="desc">{locale === 'th' ? 'มาก → น้อย' : 'Max → Min'}</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-800">
        {[
          { key: 'cash', label: t('tabCash'), count: cashSales.length },
          { key: 'closed', label: t('tabClosed'), count: closedContracts.length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => updateParams({ tab: tab.key })}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              currentTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{locale === 'th' ? 'รหัสสต็อก' : 'Stock Code'}</th>
              <th className="px-4 py-3 font-medium">{locale === 'th' ? 'รถ' : 'Vehicle'}</th>
              <th className="px-4 py-3 font-medium">{locale === 'th' ? 'ทะเบียน' : 'Plate'}</th>
              <th className="px-4 py-3 font-medium">{locale === 'th' ? 'สี' : 'Color'}</th>
              <th className="px-4 py-3 font-medium">{locale === 'th' ? 'ต้นทุนจริง' : 'Actual Cost'}</th>
              {currentTab === 'cash' && (
                <th className="px-4 py-3 font-medium">{locale === 'th' ? 'ราคาขาย' : 'Selling Price'}</th>
              )}
              {currentTab === 'closed' && (
                <>
                  <th className="px-4 py-3 font-medium">{locale === 'th' ? 'ลูกค้า' : 'Customer'}</th>
                  <th className="px-4 py-3 font-medium">{locale === 'th' ? 'ราคาขาย' : 'Sale Price'}</th>
                  <th className="px-4 py-3 font-medium">{t('closedDate')}</th>
                </>
              )}
              <th className="px-4 py-3 font-medium text-right">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-400">
                  {currentTab === 'cash' ? t('noSoldVehicles') : t('noClosedContracts')}
                </td>
              </tr>
            )}
            {sortedRows.map((r) => (
              <tr key={r.vehicle_id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.stock_code}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">
                  {r.brand} {r.model} {r.year}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.license_plate || '—'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.color || '—'}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{fmtMoney(r.actual_cost)}</td>
                {currentTab === 'cash' && (
                  <td className="px-4 py-3 font-semibold text-green-700 dark:text-green-400">{fmtMoney(r.selling_price)}</td>
                )}
                {currentTab === 'closed' && (
                  <>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">
                      {r.first_name && r.last_name ? `${r.first_name} ${r.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{fmtMoney(r.sale_price)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{r.end_date || '—'}</td>
                  </>
                )}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setDetailRow(r)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {locale === 'th' ? 'รายละเอียด' : 'Detail'}
                  </button>
                  {isDeveloper && (
                    <button
                      onClick={() => handleDelete(r.vehicle_id)}
                      disabled={deleting === r.vehicle_id}
                      className="ml-3 inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-40 text-sm font-medium"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting === r.vehicle_id ? tc('loading') : tc('delete')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {deleteError && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-red-600 text-white text-sm px-4 py-2 shadow-lg flex items-center gap-3">
          {deleteError}
          <button onClick={() => setDeleteError(null)} className="underline">✕</button>
        </div>
      )}

      {detailRow && (
        <VehicleDetailModal row={detailRow} locale={locale} onClose={() => setDetailRow(null)} />
      )}
    </div>
  );
}

function DRow({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-slate-800 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>
        {value === null || value === undefined || value === '' ? '—' : value}
      </p>
    </div>
  );
}

function VehicleDetailModal({ row, locale, onClose }: { row: SoldRow; locale: string; onClose: () => void }) {
  const isThai = locale === 'th';
  const L = (th: string, en: string) => (isThai ? th : en);
  const money = (n: number | null) =>
    n == null ? '—' : Number(n).toLocaleString(isThai ? 'th-TH' : 'en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
  const sourceLabel: Record<string, string> = { buy: L('ซื้อ', 'Buy'), trade_in: L('เทิร์น', 'Trade-in'), auction: L('ประมูล', 'Auction'), other: L('อื่นๆ', 'Other') };
  const statusLabel = row.status === 'sold_cash' ? L('ขายแล้ว', 'Sold') : L('ปิดสัญญาแล้ว', 'Closed Contract');
  const yesNo = (b: boolean | null) => b == null ? null : (b ? L('ได้รับ', 'Yes') : L('ยังไม่ได้รับ', 'No'));
  const custName = (row.first_name || row.last_name) ? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {L('รายละเอียดรถ', 'Motorcycle Detail')} — <span className="font-mono">{row.stock_code}</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <DRow label={L('รหัสสต็อก', 'Stock Code')} value={row.stock_code} mono />
          <DRow label={L('สถานะ', 'Status')} value={statusLabel} />
          <DRow label={L('ยี่ห้อ', 'Brand')} value={row.brand} />
          <DRow label={L('รุ่น', 'Model')} value={row.model} />
          <DRow label={L('รุ่นย่อย', 'Sub-model')} value={row.sub_model} />
          <DRow label={L('ปี', 'Year')} value={row.year} />
          <DRow label={L('ปีที่จดทะเบียน', 'Registration Year')} value={row.registration_year} />
          <DRow label={L('สี', 'Color')} value={row.color} />
          <DRow label={L('ทะเบียน', 'License Plate')} value={row.license_plate} />
          <DRow label={L('เลขตัวถัง', 'Chassis No.')} value={row.vin_number} />
          <DRow label={L('เลขเครื่อง', 'Engine No.')} value={row.engine_number} />
          <DRow label={L('เลขไมล์', 'Mileage')} value={row.mileage} />
          <DRow label={L('วันที่รับรถ', 'Date Received')} value={row.date_received} />
          <DRow label={L('เจ้าของเดิม', 'Previous Owner')} value={row.previous_owner} />
          <DRow label={L('แหล่งที่มา', 'Source')} value={row.vehicle_source ? (sourceLabel[row.vehicle_source] ?? row.vehicle_source) : null} />
          <DRow label={L('ต้นทุนซื้อ', 'Purchase Price')} value={money(row.purchase_price)} />
          <DRow label={L('ค่าซ่อม', 'Repair Cost')} value={money(row.repair_cost)} />
          <DRow label={L('ต้นทุนจริง', 'Actual Cost')} value={money(row.actual_cost)} />
          <DRow label={L('ราคาขาย', 'Selling Price')} value={money(row.selling_price ?? row.sale_price)} />
          <DRow label={L('เล่มทะเบียน', 'Reg. Book')} value={yesNo(row.received_registration_book)} />
          <DRow label={L('ใบกำกับภาษี', 'Tax Invoice')} value={yesNo(row.received_tax_invoice)} />
          <DRow label={L('วันรับเล่มทะเบียน', 'Reg. Received')} value={row.registration_received_date} />
        </div>

        {(row.contract_number || custName) && (
          <>
            <h3 className="font-semibold text-slate-900 dark:text-white mt-5 mb-2 text-sm">{L('ข้อมูลสัญญา / ลูกค้า', 'Contract / Customer')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
              <DRow label={L('เลขที่สัญญา', 'Contract No.')} value={row.contract_number} />
              <DRow label={L('ลูกค้า', 'Customer')} value={custName} />
              <DRow label={L('เบอร์โทร', 'Phone')} value={row.phone_number} />
              <DRow label={L('วันเริ่มสัญญา', 'Start Date')} value={row.start_date} />
              <DRow label={L('วันปิดสัญญา', 'End Date')} value={row.end_date} />
            </div>
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-slate-800 dark:bg-slate-700 text-white">
            {L('ปิด', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
