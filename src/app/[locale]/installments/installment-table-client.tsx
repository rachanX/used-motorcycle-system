'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trash2 } from 'lucide-react';
import { softDeleteContractAction } from '@/lib/supabase/contract-actions';

type InstallmentRow = {
  id: string;
  contract_number: string;
  sale_price: number | null;
  monthly_installment: number | null;
  start_date: string | null;
  status: string;
  customers: { first_name: string; last_name: string; phone_number: string | null } | null;
  vehicles: { brand: string; model: string; stock_code: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
};

export default function InstallmentTableClient({
  locale,
  contracts,
  isDeveloper
}: {
  locale: string;
  contracts: InstallmentRow[];
  isDeveloper: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isThai = locale === 'th';

  const STATUS_LABEL: Record<string, string> = {
    active: isThai ? 'ระหว่างผ่อน' : 'Active',
    overdue: isThai ? 'ค้างชำระ' : 'Overdue'
  };

  function fmtMoney(n: number | null) {
    if (n == null) return '—';
    return Number(n).toLocaleString(isThai ? 'th-TH' : 'en-US', {
      style: 'currency', currency: 'THB', maximumFractionDigits: 0
    });
  }

  async function handleDelete(contractId: string, contractNumber: string) {
    const msg = isThai
      ? `ลบสัญญา ${contractNumber}? การดำเนินการนี้ไม่สามารถย้อนกลับได้`
      : `Delete contract ${contractNumber}? This cannot be undone.`;
    if (!confirm(msg)) return;
    setDeleting(contractId);
    setDeleteError(null);
    try {
      await softDeleteContractAction(locale, contractId);
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  const colSpan = isDeveloper ? 8 : 7;

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{isThai ? 'เลขสัญญา' : 'Contract'}</th>
              <th className="px-4 py-3 font-medium">{isThai ? 'ลูกค้า' : 'Customer'}</th>
              <th className="px-4 py-3 font-medium">{isThai ? 'รถ' : 'Vehicle'}</th>
              <th className="px-4 py-3 font-medium">{isThai ? 'ยอดขาย' : 'Sale Price'}</th>
              <th className="px-4 py-3 font-medium">{isThai ? 'งวด/เดือน' : 'Monthly'}</th>
              <th className="px-4 py-3 font-medium">{isThai ? 'สถานะ' : 'Status'}</th>
              <th className="px-4 py-3 font-medium text-right">{isThai ? 'รายละเอียด' : 'Details'}</th>
              {isDeveloper && (
                <th className="px-4 py-3 font-medium text-right">{isThai ? 'จัดการ' : 'Actions'}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {contracts.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-400">
                  {isThai ? 'ไม่มีสัญญาผ่อนชำระ' : 'No installment contracts'}
                </td>
              </tr>
            )}
            {contracts.map((c) => (
              <tr key={c.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.contract_number}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white font-medium">
                  {c.customers ? `${c.customers.first_name} ${c.customers.last_name}` : '—'}
                  {c.customers?.phone_number && (
                    <p className="text-xs text-slate-400 font-normal">{c.customers.phone_number}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {c.vehicles ? `${c.vehicles.brand} ${c.vehicles.model}` : '—'}
                  {c.vehicles?.stock_code && (
                    <p className="text-xs text-slate-400 font-mono">{c.vehicles.stock_code}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{fmtMoney(c.sale_price)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{fmtMoney(c.monthly_installment)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${locale}/installments/${c.id}`}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {isThai ? 'ดูรายละเอียด' : 'View'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
                {isDeveloper && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(c.id, c.contract_number)}
                      disabled={deleting === c.id}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:opacity-40 text-sm font-medium"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting === c.id
                        ? (isThai ? 'กำลังลบ...' : 'Deleting...')
                        : (isThai ? 'ลบ' : 'Delete')}
                    </button>
                  </td>
                )}
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
    </>
  );
}
