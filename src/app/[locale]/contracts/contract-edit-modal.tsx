'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X, Lock } from 'lucide-react';
import { updateContractAction, type UpdateContractFormState } from '@/lib/supabase/contract-actions';

// Minimal shape needed — compatible with both ContractRow (list) and ContractDetail (detail page)
interface EditableContract {
  id: string;
  contract_number: string;
  sale_price: number;
  down_payment: number;
  finance_amount: number;
  total_terms: number;
  start_date: string;
  monthly_installment: number;
  due_day: number;
  end_date?: string | null;
  status: string;
  customers: { first_name: string; last_name: string } | null;
  vehicles: { brand: string; model: string; license_plate: string | null } | null;
}

export default function ContractEditModal({
  locale,
  contract,
  onClose,
}: {
  locale: string;
  contract: EditableContract;
  onClose: () => void;
}) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');

  const action = updateContractAction.bind(null, locale, contract.id);
  const [state, formAction, isPending] = useActionState<UpdateContractFormState, FormData>(action, {});
  const submitCount = useRef(0);

  useEffect(() => {
    if (submitCount.current > 0 && !isPending && !state.error) onClose();
  }, [state, isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  function fmtMoney(n: number) {
    return n.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 my-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t('editContract')}</h2>
            <p className="font-mono text-xs text-slate-400 mt-0.5">{contract.contract_number}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Read-only summary */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 mb-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              ข้อมูลสัญญา — แก้ไขไม่ได้หลังสร้าง
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <ReadOnly
              label={t('customer')}
              value={contract.customers ? `${contract.customers.first_name} ${contract.customers.last_name}` : '—'}
            />
            <ReadOnly
              label={t('vehicle')}
              value={
                contract.vehicles
                  ? `${contract.vehicles.brand} ${contract.vehicles.model}${contract.vehicles.license_plate ? ` (${contract.vehicles.license_plate})` : ''}`
                  : '—'
              }
            />
            <ReadOnly label={t('salePrice')} value={fmtMoney(contract.sale_price)} />
            <ReadOnly label={t('downPayment')} value={fmtMoney(contract.down_payment)} />
            <ReadOnly label={t('financeAmount')} value={fmtMoney(contract.finance_amount)} />
            <ReadOnly label={t('startDate')} value={contract.start_date} />
          </div>
        </div>

        {/* Editable fields */}
        <form
          action={formAction}
          onSubmit={() => { submitCount.current += 1; }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('monthlyInstallment')} required>
              <input
                name="monthly_installment"
                type="number"
                step="0.01"
                min={0.01}
                defaultValue={contract.monthly_installment}
                required
                className="input"
              />
            </Field>

            <Field label={t('dueDay')} required hint="1–31">
              <input
                name="due_day"
                type="number"
                min={1}
                max={31}
                defaultValue={contract.due_day}
                required
                className="input"
              />
            </Field>

            <Field label={t('status')} required>
              <select name="status" defaultValue={contract.status} required className="input">
                <option value="active">{t('statusActive')}</option>
                <option value="completed">{t('statusCompleted')}</option>
                <option value="overdue">{t('statusOverdue')}</option>
                <option value="cancelled">{t('statusCancelled')}</option>
              </select>
            </Field>

            <Field label={t('endDate')}>
              <input
                name="end_date"
                type="date"
                defaultValue={contract.end_date ?? ''}
                className="input"
              />
            </Field>
          </div>

          {state.error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {tc('cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium"
            >
              {isPending ? tc('loading') : tc('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{value}</p>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="ml-1 text-xs font-normal text-slate-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
