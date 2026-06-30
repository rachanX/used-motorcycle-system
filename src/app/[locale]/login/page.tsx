import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import LoginForm from './login-form';
import LanguageSwitcher from '@/components/language-switcher';

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { locale } = await params;
  const { redirectTo } = await searchParams;
  const t = await getTranslations('auth');
  const tc = await getTranslations('common');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher locale={locale} />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt={tc('appName')}
            width={64}
            height={64}
            className="mx-auto mb-4 rounded-xl"
            priority
          />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            {tc('appName')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('loginSubtitle')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <LoginForm locale={locale} redirectTo={redirectTo ?? `/${locale}/dashboard`} />
        </div>
      </div>
    </div>
  );
}
