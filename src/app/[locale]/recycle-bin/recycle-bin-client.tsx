'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, RotateCcw, Bike, FileText, User, AlertTriangle } from 'lucide-react';
import { restoreDeletedItem, purgeDeletedItem, type RecycleKind } from '@/lib/supabase/recycle-actions';

export type RecycleItem = {
  kind: RecycleKind;
  id: string;
  title: string;
  subtitle: string;
  deletedAt: string;
};

const RETENTION_DAYS = 7;

export default function RecycleBinClient({ locale, items }: { locale: string; items: RecycleItem[] }) {
  const isThai = locale === 'th';
  const L = (th: string, en: string) => (isThai ? th : en);
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const kindLabel = (k: RecycleKind) =>
    k === 'vehicle' ? L('รถ', 'Motorcycle') : k === 'contract' ? L('สัญญา', 'Contract') : L('ลูกค้า', 'Customer');
  const KindIcon = ({ k }: { k: RecycleKind }) =>
    k === 'vehicle' ? <Bike className="h-4 w-4" /> : k === 'contract' ? <FileText className="h-4 w-4" /> : <User className="h-4 w-4" />;

  const daysLeft = (deletedAt: string) => {
    const elapsed = (Date.now() - new Date(deletedAt).getTime()) / 86400000;
    return Math.max(0, Math.ceil(RETENTION_DAYS - elapsed));
  };
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(isThai ? 'th-TH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const errMsg = (code?: string) => {
    switch (code) {
      case 'vehicleHasContract': return L('ลบไม่ได้: รถนี้มีสัญญาผูกอยู่', 'Cannot delete: this motorcycle is linked to a contract.');
      case 'customerHasContract': return L('ลบไม่ได้: ลูกค้ารายนี้มีสัญญาผูกอยู่', 'Cannot delete: this customer is linked to a contract.');
      case 'restoreFailed': return L('กู้คืนไม่สำเร็จ', 'Restore failed.');
      default: return L('ดำเนินการไม่สำเร็จ', 'Action failed.');
    }
  };

  async function onRestore(it: RecycleItem) {
    setBusy(it.id); setErr(null);
    const res = await restoreDeletedItem(locale, it.kind, it.id);
    setBusy(null);
    if (res?.error) { setErr(errMsg(res.error)); return; }
    start(() => router.refresh());
  }

  async function onPurge(it: RecycleItem) {
    if (!confirm(L('ลบถาวร? ไม่สามารถกู้คืนได้', 'Delete permanently? This cannot be undone.'))) return;
    setBusy(it.id); setErr(null);
    const res = await purgeDeletedItem(locale, it.kind, it.id);
    setBusy(null);
    if (res?.error) { setErr(errMsg(res.error)); return; }
    start(() => router.refresh());
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {L('ถังขยะ', 'Recycle Bin')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {L('รายการที่ถูกลบจะเก็บไว้ 7 วันแล้วลบถาวรโดยอัตโนมัติ', 'Deleted items are kept for 7 days, then permanently removed automatically.')}
        </p>
      </div>

      {err && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{L('ประเภท', 'Type')}</th>
              <th className="px-4 py-3 font-medium">{L('รายการ', 'Item')}</th>
              <th className="px-4 py-3 font-medium">{L('ลบเมื่อ', 'Deleted')}</th>
              <th className="px-4 py-3 font-medium">{L('เหลือ', 'Days left')}</th>
              <th className="px-4 py-3 font-medium text-right">{L('จัดการ', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                  {L('ถังขยะว่างเปล่า', 'The recycle bin is empty.')}
                </td>
              </tr>
            )}
            {items.map((it) => {
              const left = daysLeft(it.deletedAt);
              return (
                <tr key={`${it.kind}-${it.id}`} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <KindIcon k={it.kind} /> {kindLabel(it.kind)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{it.title}</p>
                    {it.subtitle && <p className="text-xs text-slate-400">{it.subtitle}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmtDate(it.deletedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      left <= 1 ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
                      {left} {L('วัน', left === 1 ? 'day' : 'days')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => onRestore(it)} disabled={busy === it.id}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-40 text-sm font-medium">
                      <RotateCcw className="h-3.5 w-3.5" /> {L('กู้คืน', 'Restore')}
                    </button>
                    <button onClick={() => onPurge(it)} disabled={busy === it.id}
                      className="ml-3 inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-40 text-sm font-medium">
                      <Trash2 className="h-3.5 w-3.5" /> {L('ลบถาวร', 'Delete forever')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
