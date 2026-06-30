'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { loginAction, type LoginState } from '@/lib/supabase/auth-actions';

const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: 'loginError',
  account_disabled: 'accountDisabled',
  invalid_input: 'loginError'
};

export default function LoginForm({
  locale,
  redirectTo
}: {
  locale: string;
  redirectTo: string;
}) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const boundAction = loginAction.bind(null, locale, redirectTo);
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    boundAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('username')}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="your_username"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {t(ERROR_KEYS[state.error] ?? 'loginError')}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 transition-colors"
      >
        {isPending ? tc('loading') : t('loginButton')}
      </button>
    </form>
  );
}
