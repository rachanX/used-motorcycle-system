'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { createCustomerAction, updateCustomerAction, type CustomerFormState } from '@/lib/supabase/customer-actions';
import type { Customer } from '@/types/database.types';

export default function CustomerFormModal({
  locale,
  mode,
  customer,
  branches,
  defaultBranchId,
  onClose
}: {
  locale: string;
  mode: 'create' | 'edit';
  customer?: Customer;
  branches: { id: string; branch_name: string }[];
  defaultBranchId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations('customers');
  const tc = useTranslations('common');

  const action =
    mode === 'create'
      ? createCustomerAction.bind(null, locale)
      : updateCustomerAction.bind(null, locale, customer!.id);

  const [state, formAction, isPending] = useActionState<CustomerFormState, FormData>(action, {});
  const submitCount = useRef(0);

  useEffect(() => {
    if (submitCount.current > 0 && !isPending && !state.error) onClose();
  }, [state, isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 my-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {mode === 'create' ? t('addCustomer') : t('editCustomer')}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form
          action={formAction}
          onSubmit={() => { submitCount.current += 1; }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          <Field label={t('firstName')}>
            <input name="first_name" defaultValue={customer?.first_name} required className="input" />
          </Field>
          <Field label={t('lastName')}>
            <input name="last_name" defaultValue={customer?.last_name} required className="input" />
          </Field>

          <Field label={t('phoneNumber')}>
            <input name="phone_number" defaultValue={customer?.phone_number} required className="input" />
          </Field>
          <Field label={t('nationalId')}>
            <input name="national_id" defaultValue={customer?.national_id ?? ''} maxLength={13} className="input" />
          </Field>

          <div className="sm:col-span-2">
            <Field label={t('address')}>
              <textarea name="address" defaultValue={customer?.address ?? ''} rows={2} className="input" />
            </Field>
          </div>

          <Field label={t('district')}>
            <input name="district" defaultValue={customer?.district ?? ''} className="input" />
          </Field>
          <Field label={t('province')}>
            <input name="province" defaultValue={customer?.province ?? ''} className="input" />
          </Field>

          <Field label={t('postalCode')}>
            <input name="postal_code" defaultValue={customer?.postal_code ?? ''} maxLength={5} className="input" />
          </Field>
          <Field label={t('branch')}>
            <select
              name="branch_id"
              defaultValue={customer?.branch_id ?? defaultBranchId ?? ''}
              required
              disabled={!!defaultBranchId && mode === 'create'}
              className="input"
            >
              <option value="" disabled>—</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.branch_name}</option>
              ))}
            </select>
          </Field>

          <Field label={t('guarantorName')}>
            <input name="guarantor_name" defaultValue={customer?.guarantor_name ?? ''} className="input" />
          </Field>
          <Field label={t('guarantorPhone')}>
            <input name="guarantor_phone" defaultValue={customer?.guarantor_phone ?? ''} className="input" />
          </Field>

          <div className="sm:col-span-2">
            <Field label={t('notes')}>
              <textarea name="notes" defaultValue={customer?.notes ?? ''} rows={2} className="input" />
            </Field>
          </div>

          {state.error && (
            <p className="sm:col-span-2 text-sm text-red-600" role="alert">
              {t(state.error as any)}
            </p>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
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
