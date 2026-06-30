'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, Phone, MapPin, IdCard, ShieldCheck, FilePlus } from 'lucide-react';
import CustomerFormModal from '../customer-form-modal';
import type { Customer, Contract, Payment } from '@/types/database.types';

type ContractWithDetails = Contract & {
  vehicles: { brand: string; model: string; stock_code: string } | null;
  payments: Payment[];
};

const CONTRACT_STATUS_KEYS: Record<string, string> = {
  active: 'statusActive',
  completed: 'statusCompleted',
  overdue: 'statusOverdue',
  cancelled: 'statusCancelled'
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
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

export default function CustomerProfileClient({
  locale,
  customer,
  contracts,
  branches
}: {
  locale: string;
  customer: Customer;
  contracts: ContractWithDetails[];
  branches: { id: string; branch_name: string }[];
}) {
  const t = useTranslations('customers');
  const tc = useTranslations('common');
  const tContracts = useTranslations('contracts');
  const [editing, setEditing] = useState(false);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  function fmtMoney(n: number) {
    return n.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0
    });
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">{t('customerProfile')}</p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
              {customer.first_name} {customer.last_name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/${locale}/contracts/new?customer_id=${customer.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
            >
              <FilePlus className="h-4 w-4" />
              {tContracts('createContract')}
            </Link>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4" />
              {tc('edit')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{t('contactInfo')}</h3>
            <div className="space-y-2 text-sm">
              <InfoRow icon={Phone} value={customer.phone_number} />
              <InfoRow icon={IdCard} value={customer.national_id} />
              <InfoRow
                icon={MapPin}
                value={[customer.address, customer.district, customer.province, customer.postal_code]
                  .filter(Boolean)
                  .join(' ')}
              />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{t('guarantorInfo')}</h3>
            <div className="space-y-2 text-sm">
              <InfoRow icon={ShieldCheck} value={customer.guarantor_name} />
              <InfoRow icon={Phone} value={customer.guarantor_phone} />
            </div>
          </div>
        </div>
      </div>

      {/* Contract history */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('contractHistory')}</h2>
          <span className="text-xs text-slate-400">{t('totalContracts')}: {contracts.length}</span>
        </div>

        {contracts.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">{t('noContracts')}</p>
        ) : (
          <div className="space-y-3">
            {contracts.map((c) => {
              const isOpen = expandedContract === c.id;
              const paidCount = c.payments.filter((p) => p.status === 'paid').length;
              return (
                <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setExpandedContract(isOpen ? null : c.id)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {c.contract_number} · {c.vehicles?.brand} {c.vehicles?.model}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fmtMoney(c.sale_price)} · {paidCount}/{c.total_terms} {t('installment').toLowerCase()}
                      </p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${CONTRACT_STATUS_COLORS[c.status]}`}>
                      {t(CONTRACT_STATUS_KEYS[c.status])}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                      <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                        {t('paymentHistory')}
                      </h4>
                      {c.payments.length === 0 ? (
                        <p className="text-sm text-slate-400">{t('noPayments')}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-slate-400">
                                <th className="py-1.5 pr-3">{t('installment')}</th>
                                <th className="py-1.5 pr-3">{t('dueDate')}</th>
                                <th className="py-1.5 pr-3">{t('amountDue')}</th>
                                <th className="py-1.5 pr-3">{t('amountPaid')}</th>
                                <th className="py-1.5 pr-3">{t('paymentDate')}</th>
                                <th className="py-1.5">{tc('status')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.payments
                                .sort((a, b) => a.installment_number - b.installment_number)
                                .map((p) => (
                                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">#{p.installment_number}</td>
                                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{p.due_date}</td>
                                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{fmtMoney(p.amount_due)}</td>
                                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{fmtMoney(p.amount_paid)}</td>
                                    <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{p.payment_date || '—'}</td>
                                    <td className="py-1.5">
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${PAYMENT_STATUS_COLORS[p.status]}`}>
                                        {t(PAYMENT_STATUS_KEYS[p.status])}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <CustomerFormModal
          locale={locale}
          mode="edit"
          customer={customer}
          branches={branches}
          defaultBranchId={null}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, value }: { icon: React.ElementType; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
      <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <span>{value}</span>
    </div>
  );
}
