'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { updateContractAction, type UpdateContractFormState } from '@/lib/supabase/contract-actions';
import type { Contract } from '@/types/database.types';

export default function EditContractModal({
  locale,
  contract,
  onClose
}: {
  locale: string;
  contract: Contract;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('editContract')}</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <p className="text-xs text-slate-400 mb-4 font-mono">{contract.contract_number}</p>

        <form
          action={formAction}
          onSubmit={() => { submitCount.current += 1; }}
          className="space-y-3"
        >
          <Field label={t('monthlyInstallment')}>
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

          <Field label={t('dueDay')}>
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

          <Field label={t('endDate')}>
            <input name="end_date" type="date" defaultValue={contract.end_date ?? ''} className="input" />
          </Field>

          <Field label={t('status')}>
            <select name="status" defaultValue={contract.status} className="input">
              <option value="active">{t('statusActive')}</option>
              <option value="completed">{t('statusCompleted')}</option>
              <option value="overdue">{t('statusOverdue')}</option>
              <option value="cancelled">{t('statusCancelled')}</option>
            </select>
          </Field>

          {state.error && (
            <p className="text-sm text-red-600" role="alert">{t(state.error as any)}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium"
            >
              {isPending ? tc('loading') : tc('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
    </div>
  );
}
