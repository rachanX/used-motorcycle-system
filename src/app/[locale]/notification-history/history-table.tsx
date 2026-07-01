'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { sendNowAction, type SendNowState } from '@/lib/notifications/actions';
import { customerName, type HistoryRow } from '@/lib/notifications/history';

export default function HistoryTable({
  locale,
  rows,
  page,
  totalPages,
  total,
  filters,
}: {
  locale: string;
  rows: HistoryRow[];
  page: number;
  totalPages: number;
  total: number;
  filters: { from: string; to: string; status: string; q: string };
}) {
  const isThai = locale === 'th';
  const L = (th: string, en: string) => (isThai ? th : en);
  const basePath = `/${locale}/notification-history`;

  const [sendState, sendAction, sending] = useActionState<SendNowState, FormData>(
    sendNowAction.bind(null, locale),
    {}
  );

  const exportQs = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][]
  ).toString();
  const exportHref = `/api/notifications/history/export${exportQs ? `?${exportQs}` : ''}`;

  const statusPill = (s: string) => {
    const map: Record<string, string> = {
      success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      failed: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
      skipped: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    };
    return map[s] ?? 'bg-slate-100 text-slate-600';
  };

  const pageHref = (p: number) => {
    const qs = new URLSearchParams({ ...filters, page: String(p) } as Record<string, string>);
    for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
    return `${basePath}?${qs.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {L('ประวัติการแจ้งเตือน', 'Notification History')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {L(`ทั้งหมด ${total} รายการ`, `${total} total`)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportHref}
            className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {L('ส่งออก Excel', 'Export Excel')}
          </a>
          <form action={sendAction}>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? L('กำลังส่ง…', 'Sending…') : L('ส่งเดี๋ยวนี้', 'Send Now')}
            </button>
          </form>
        </div>
      </div>

      {(sendState.ok || sendState.error) && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            sendState.ok
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
          }`}
        >
          {sendState.ok
            ? L(
                `ส่งแล้ว ${sendState.sent} • ล้มเหลว ${sendState.failed} • ข้าม ${sendState.skipped} • ค้างชำระ ${sendState.total}`,
                `Sent ${sendState.sent} • Failed ${sendState.failed} • Skipped ${sendState.skipped} • Overdue ${sendState.total}`
              )
            : `${L('ส่งไม่สำเร็จ', 'Send failed')}: ${sendState.error}`}
        </div>
      )}

      {/* Filters (GET form) */}
      <form method="get" action={basePath} className="flex flex-wrap items-end gap-2">
        <FilterField label={L('จากวันที่', 'From')}>
          <input type="date" name="from" defaultValue={filters.from} className="input" />
        </FilterField>
        <FilterField label={L('ถึงวันที่', 'To')}>
          <input type="date" name="to" defaultValue={filters.to} className="input" />
        </FilterField>
        <FilterField label={L('สถานะ', 'Status')}>
          <select name="status" defaultValue={filters.status} className="input">
            <option value="">{L('ทั้งหมด', 'All')}</option>
            <option value="success">{L('สำเร็จ', 'Success')}</option>
            <option value="failed">{L('ล้มเหลว', 'Failed')}</option>
            <option value="skipped">{L('ข้าม', 'Skipped')}</option>
          </select>
        </FilterField>
        <FilterField label={L('ค้นหา (สัญญา/ลูกค้า)', 'Search (contract/customer)')}>
          <input type="text" name="q" defaultValue={filters.q} className="input" />
        </FilterField>
        <button type="submit" className="rounded-lg bg-slate-800 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-white">
          {L('กรอง', 'Filter')}
        </button>
        <Link href={basePath} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:underline">
          {L('ล้าง', 'Clear')}
        </Link>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-slate-500 dark:text-slate-400">
            <tr>
              <Th>{L('วันเวลา', 'Date & Time')}</Th>
              <Th>{L('เลขสัญญา', 'Contract')}</Th>
              <Th>{L('ลูกค้า', 'Customer')}</Th>
              <Th>{L('รหัสสต็อก', 'Stock')}</Th>
              <Th>{L('ยี่ห้อ', 'Brand')}</Th>
              <Th>{L('รุ่น', 'Model')}</Th>
              <Th>{L('ทะเบียน', 'Plate')}</Th>
              <Th>{L('ค้าง (วัน)', 'Overdue')}</Th>
              <Th>{L('ปลายทาง', 'Destination')}</Th>
              <Th>{L('สถานะ', 'Status')}</Th>
              <Th>{L('ข้อผิดพลาด', 'Error')}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                  {L('ไม่พบรายการ', 'No notifications found')}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="text-slate-700 dark:text-slate-200">
                <Td>{new Date(r.sent_at).toLocaleString(isThai ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok' })}</Td>
                <Td>{r.contract_number ?? (r.notification_type === 'test' ? L('ทดสอบ', 'Test') : '-')}</Td>
                <Td>{customerName(r)}</Td>
                <Td>{r.stock_code ?? '-'}</Td>
                <Td>{r.brand ?? '-'}</Td>
                <Td>{r.model ?? '-'}</Td>
                <Td>{r.license_plate ?? '-'}</Td>
                <Td>{r.overdue_days ?? '-'}</Td>
                <Td className="max-w-[10rem] truncate">{r.destination ?? '-'}</Td>
                <Td>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusPill(r.status)}`}>
                    {r.status}
                  </span>
                </Td>
                <Td className="max-w-[14rem] truncate text-red-600 dark:text-red-400">{r.error_message ?? ''}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5">
              {L('ก่อนหน้า', 'Prev')}
            </Link>
          )}
          <span className="text-slate-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5">
              {L('ถัดไป', 'Next')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 font-medium">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 ${className}`}>{children}</td>;
}
