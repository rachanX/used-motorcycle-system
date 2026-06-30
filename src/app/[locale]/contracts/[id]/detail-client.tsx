'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Wallet, Calendar, AlertTriangle, ListChecks, X, Pencil, Trash2 } from 'lucide-react';
import { cancelContractAction, softDeleteContractAction } from '@/lib/supabase/contract-actions';
import ConfirmModal from '@/components/confirm-modal';
import EditContractModal from './edit-contract-modal';
import type { Contract, Customer, Payment } from '@/types/database.types';

type ContractDetail = Contract & {
  customers: Pick<Customer, 'first_name' | 'last_name' | 'phone_number'> | null;
  vehicles: { brand: string; model: string; stock_code: string; license_plate: string | null } | null;
  payments: Payment[];
};

type Summary = {
  total_terms: number;
  paid_terms: number;
  remaining_terms: number;
  outstanding_balance: number;
  next_due_date: string | null;
  max_days_overdue: number;
} | null;

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
const PAYMENT_STATUS_KEYS: Record<string, string> = {
  paid: 'paymentStatusPaid',
  pending: 'paymentStatusPending',
  overdue: 'paymentStatusOverdue'
};
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
};

export default function ContractDetailClient({
  locale,
  contract,
  summary,
  isDeveloper
}: {
  locale: string;
  contract: ContractDetail;
  summary: Summary;
  isDeveloper: boolean;
}) {
  const t = useTranslations('contracts');
  const tCust = useTranslations('customers');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function fmtMoney(n: number) {
    return n.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0
    });
  }

  const cards = [
    { label: t('remainingBalance'), value: fmtMoney(summary?.outstanding_balance ?? 0), icon: Wallet, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
    { label: t('paidTerms'), value: `${summary?.paid_terms ?? 0} / ${summary?.total_terms ?? contract.total_terms}`, icon: ListChecks, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
    { label: t('nextDueDate'), value: summary?.next_due_date ?? '—', icon: Calendar, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950' },
    { label: t('daysOverdue'), value: summary?.max_days_overdue ?? 0, icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-950' }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{t('contractDetails')}</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mt-1 font-mono">
              {contract.contract_number}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {contract.customers?.first_name} {contract.customers?.last_name} · {contract.vehicles?.brand}{' '}
              {contract.vehicles?.model} {contract.vehicles?.license_plate ? `(${contract.vehicles.license_plate})` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[contract.status]}`}>
              {t(STATUS_KEYS[contract.status])}
            </span>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Pencil className="h-4 w-4" />
              {tc('edit')}
            </button>
            {contract.status === 'active' && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
                {t('cancelContract')}
              </button>
            )}
            {isDeveloper && contract.status !== 'active' && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {tc('delete')}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-sm">
          <InfoItem label={t('salePrice')} value={fmtMoney(contract.sale_price)} />
          <InfoItem label={t('downPayment')} value={fmtMoney(contract.down_payment)} />
          <InfoItem label={t('financeAmount')} value={fmtMoney(contract.finance_amount)} />
          <InfoItem label={t('monthlyInstallment')} value={fmtMoney(contract.monthly_installment)} />
          <InfoItem label={t('startDate')} value={contract.start_date} />
          <InfoItem label={t('dueDay')} value={String(contract.due_day)} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl mb-2 ${c.color}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">{t('paymentSchedule')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 pr-3">{tCust('installment')}</th>
                <th className="py-2 pr-3">{tCust('dueDate')}</th>
                <th className="py-2 pr-3">{tCust('amountDue')}</th>
                <th className="py-2 pr-3">{tCust('amountPaid')}</th>
                <th className="py-2 pr-3">{tCust('paymentDate')}</th>
                <th className="py-2">{tCust('status')}</th>
              </tr>
            </thead>
            <tbody>
              {[...contract.payments]
                .sort((a, b) => a.installment_number - b.installment_number)
                .map((p) => (
                  <tr key={p.id} className="border-b last:border-0 border-slate-50 dark:border-slate-800/50">
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">#{p.installment_number}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{p.due_date}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{fmtMoney(p.amount_due)}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{fmtMoney(p.amount_paid)}</td>
                    <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{p.payment_date || '—'}</td>
                    <td className="py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status]}`}>
                        {tCust(PAYMENT_STATUS_KEYS[p.status])}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmModal
          message={t('confirmCancel')}
          onConfirm={() =>
            new Promise<void>((resolve) =>
              startTransition(async () => {
                await cancelContractAction(locale, contract.id);
                resolve();
              })
            )
          }
          onClose={() => setConfirmCancel(false)}
        />
      )}

      {editing && (
        <EditContractModal locale={locale} contract={contract} onClose={() => setEditing(false)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          message={tc('confirmDeleteMessage')}
          onConfirm={async () => {
            try {
              await softDeleteContractAction(locale, contract.id);
              router.push(`/${locale}/contracts`);
            } catch (e) {
              setDeleteError(e instanceof Error ? e.message : 'error');
              throw e;
            }
          }}
          onClose={() => setConfirmDelete(false)}
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-900 dark:text-white font-medium mt-0.5">{value}</p>
    </div>
  );
}
