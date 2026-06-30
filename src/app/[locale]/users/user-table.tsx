'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { UserPlus, Pencil, X } from 'lucide-react';
import { inviteUserAction, updateUserAction, type CreateUserState } from '@/lib/supabase/user-actions';
import type { AppUser } from '@/types/database.types';

type Branch = { id: string; branch_name: string };

export default function UserTable({
  locale,
  initialUsers,
  branches,
  currentUserId
}: {
  locale: string;
  initialUsers: AppUser[];
  branches: Branch[];
  currentUserId: string;
}) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [inviting, setInviting] = useState(false);

  const branchName = (id: string | null) =>
    id ? branches.find((b) => b.id === id)?.branch_name ?? '—' : t('noBranch');

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setInviting(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          <UserPlus className="h-4 w-4" />
          {t('inviteUser')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{t('fullName')}</th>
              <th className="px-4 py-3 font-medium">{t('username')}</th>
              <th className="px-4 py-3 font-medium">{t('email')}</th>
              <th className="px-4 py-3 font-medium">{t('role')}</th>
              <th className="px-4 py-3 font-medium">{t('branch')}</th>
              <th className="px-4 py-3 font-medium">{t('status')}</th>
              <th className="px-4 py-3 font-medium text-right">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {tc('noData')}
                </td>
              </tr>
            )}
            {initialUsers.map((u) => (
              <tr key={u.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 text-slate-900 dark:text-white">{u.full_name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.username}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === 'developer'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {u.role === 'developer' ? t('roleDeveloper') : t('roleStaff')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{branchName(u.branch_id)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.is_active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                    }`}
                  >
                    {u.is_active ? t('active') : t('inactive')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing(u)}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {tc('edit')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditUserModal
          locale={locale}
          user={editing}
          branches={branches}
          isSelf={editing.id === currentUserId}
          onClose={() => setEditing(null)}
        />
      )}
      {inviting && <InviteUserModal locale={locale} branches={branches} onClose={() => setInviting(false)} />}
    </div>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EditUserModal({
  locale,
  user,
  branches,
  isSelf,
  onClose
}: {
  locale: string;
  user: AppUser;
  branches: Branch[];
  isSelf: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  return (
    <ModalShell title={t('fullName') + ': ' + user.full_name} onClose={onClose}>
      <form
        action={async (formData) => {
          formData.set('id', user.id);
          await updateUserAction(locale, formData);
          onClose();
        }}
        className="space-y-3"
      >
        <Field label={t('fullName')}>
          <input name="full_name" defaultValue={user.full_name} required className="input" />
        </Field>
        <Field label={t('username')}>
          <input name="username" defaultValue={user.username} required pattern="[a-z0-9_]+" title="Lowercase letters, numbers, underscores only" className="input" />
          <p className="text-xs text-slate-400 mt-1">Lowercase letters, numbers, underscores only</p>
        </Field>
        <Field label={t('phone')}>
          <input name="phone" defaultValue={user.phone ?? ''} className="input" />
        </Field>
        <Field label={t('role')}>
          {isSelf ? (
            <>
              <input type="hidden" name="role" value={user.role} />
              <div className="input bg-slate-50 dark:bg-slate-800 text-slate-500">
                {user.role === 'developer' ? t('roleDeveloper') : t('roleStaff')}
              </div>
            </>
          ) : (
            <select name="role" defaultValue={user.role} className="input">
              <option value="staff">{t('roleStaff')}</option>
              <option value="developer">{t('roleDeveloper')}</option>
            </select>
          )}
          {isSelf && <p className="text-xs text-amber-600 mt-1">{t('cannotEditSelfRole')}</p>}
        </Field>
        <Field label={t('branch')}>
          <select name="branch_id" defaultValue={user.branch_id ?? ''} className="input">
            <option value="">{t('noBranch')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.branch_name}</option>
            ))}
          </select>
        </Field>
        {isSelf ? (
          <input type="hidden" name="is_active" value={user.is_active ? 'on' : ''} />
        ) : (
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" name="is_active" defaultChecked={user.is_active} />
            {t('active')}
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
            {tc('cancel')}
          </button>
          <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">
            {tc('save')}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function InviteUserModal({ locale, branches, onClose }: { locale: string; branches: Branch[]; onClose: () => void }) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const router = useRouter();
  const boundAction = inviteUserAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState<CreateUserState, FormData>(boundAction, {});
  const submitCount = useRef(0);

  // Track each submission so we can detect completion
  const wrappedAction = (formData: FormData) => {
    submitCount.current += 1;
    return (formAction as (f: FormData) => void)(formData);
  };

  // Close modal and refresh on success
  useEffect(() => {
    if (submitCount.current > 0 && !isPending && !state.error) {
      router.refresh();
      onClose();
    }
  }, [state, isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ModalShell title={t('inviteUser')} onClose={onClose}>
      <form action={wrappedAction} className="space-y-3">
        <Field label={t('fullName')}>
          <input name="full_name" required className="input" />
        </Field>
        <Field label={t('username')}>
          <input name="username" required pattern="[a-z0-9_]+" title="Lowercase letters, numbers, underscores only" className="input" placeholder="e.g. somchai_ts" />
          <p className="text-xs text-slate-400 mt-1">Used for login. Lowercase letters, numbers, underscores only.</p>
        </Field>
        <Field label={t('email')}>
          <input name="email" type="email" required className="input" />
        </Field>
        <Field label={t('initialPassword')}>
          <input name="password" type="password" required minLength={6} className="input" placeholder="Min. 6 characters" />
          <p className="text-xs text-slate-400 mt-1">Staff uses this to log in for the first time.</p>
        </Field>
        <Field label={t('role')}>
          <select name="role" defaultValue="staff" className="input">
            <option value="staff">{t('roleStaff')}</option>
            <option value="developer">{t('roleDeveloper')}</option>
          </select>
        </Field>
        <Field label={t('branch')}>
          <select name="branch_id" className="input">
            <option value="">{t('noBranch')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.branch_name}</option>
            ))}
          </select>
        </Field>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
            {tc('cancel')}
          </button>
          <button type="submit" disabled={isPending} className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium">
            {isPending ? tc('loading') : t('inviteUser')}
          </button>
        </div>
      </form>
    </ModalShell>
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
