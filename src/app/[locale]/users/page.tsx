import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import UserTable from './user-table';

export default async function UsersPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const me = await getCurrentAppUser();

  // Hard guard: even if middleware's lighter check is ever bypassed,
  // this server-side check + RLS on the `users` table both deny staff.
  if (!me || me.role !== 'developer') {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations('users');
  const supabase = await createClient();

  const [{ data: users }, { data: branches }] = await Promise.all([
    supabase.from('users').select('*').order('created_at', { ascending: false }),
    supabase.from('branches').select('id, branch_name').eq('status', 'active')
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
      </div>

      <UserTable
        locale={locale}
        initialUsers={users ?? []}
        branches={branches ?? []}
        currentUserId={me.id}
      />
    </div>
  );
}
