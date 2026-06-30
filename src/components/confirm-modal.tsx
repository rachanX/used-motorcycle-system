'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Generic "Are you sure?" modal. Wrap any delete trigger with this so
 * every destructive action across the app shares one consistent UX.
 *
 * Usage:
 *   const [confirming, setConfirming] = useState(false);
 *   <button onClick={() => setConfirming(true)}>{tc('delete')}</button>
 *   {confirming && (
 *     <ConfirmModal
 *       message={t('confirmDeleteMessage')}
 *       onConfirm={async () => { await deleteAction(id); }}
 *       onClose={() => setConfirming(false)}
 *     />
 *   )}
 */
export default function ConfirmModal({
  message,
  onConfirm,
  onClose,
  destructive = true
}: {
  message: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  destructive?: boolean;
}) {
  const tc = useTranslations('common');
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // The caller (e.g. setDeleteError in the parent table component)
      // already captured and displayed the real error message before
      // re-throwing here. We deliberately swallow it at this level so
      // it doesn't bubble up as an unhandled error and crash the whole
      // page with Next.js's full-screen dev error overlay — the modal
      // simply stays open so the user can read the toast and retry.
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-start justify-between mb-3">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
            destructive
              ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
              : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button onClick={onClose} disabled={isPending}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-200 mb-6">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
          >
            {tc('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={`px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-60 ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isPending ? tc('loading') : tc('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
