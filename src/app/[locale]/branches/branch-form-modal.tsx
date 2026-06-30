'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { createBranchAction, updateBranchAction, type BranchFormState } from '@/lib/supabase/branch-actions';
import type { Branch } from '@/types/database.types';

const ERROR_KEYS: Record<string, string> = {
  code_exists: 'codeExists',
  forbidden: 'developerOnlyWrite',
  invalid_input: 'codeExists',
  unknown: 'codeExists'
};

export default function BranchFormModal({
  locale,
  mode,
  branch,
  onClose
}: {
  locale: string;
  mode: 'create' | 'edit';
  branch?: Branch;
  onClose: () => void;
}) {
  const t = useTranslations('branches');
  const tc = useTranslations('common');

  const action =
    mode === 'create'
      ? createBranchAction.bind(null, locale)
      : updateBranchAction.bind(null, locale, branch!.id);

  const [state, formAction, isPending] = useActionState<BranchFormState, FormData>(action, {});
  const submitCount = useRef(0);

  useEffect(() => {
    // Skip the initial mount; close only after a real submission that
    // came back with no error.
    if (submitCount.current > 0 && !isPending && !state.error) {
      onClose();
    }
  }, [state, isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">
            {mode === 'create' ? t('addBranch') : t('editBranch')}
          </h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <form
          action={formAction}
          onSubmit={() => {
            submitCount.current += 1;
          }}
          className="space-y-3"
        >
          <Field label={t('branchCode')}>
            <input name="branch_code" defaultValue={branch?.branch_code} required maxLength={20} className="input" />
          </Field>
          <Field label={t('branchName')}>
            <input name="branch_name" defaultValue={branch?.branch_name} required className="input" />
          </Field>
          <Field label={t('address')}>
            <textarea name="address" defaultValue={branch?.address ?? ''} rows={2} className="input" />
          </Field>
          <Field label={t('phoneNumber')}>
            <input name="phone_number" defaultValue={branch?.phone_number ?? ''} className="input" />
          </Field>
          <Field label={t('status')}>
            <select name="status" defaultValue={branch?.status ?? 'active'} className="input">
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </Field>

          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {t(ERROR_KEYS[state.error] ?? 'codeExists')}
            </p>
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
