import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/supabase/server';
import { getSettings, toPublicSettings } from '@/lib/notifications/settings';
import { getNotificationStatus } from '@/lib/notifications/service';
import LineSettingsForm from './line-settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const me = await getCurrentAppUser();

  // Developer-only (middleware also blocks /settings for non-developers).
  if (!me || me.role !== 'developer') {
    redirect(`/${locale}/dashboard`);
  }

  const settings = await getSettings();
  const publicSettings = toPublicSettings(settings);
  const status = await getNotificationStatus();
  const isThai = locale === 'th';

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {isThai ? 'ตั้งค่า' : 'Settings'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isThai
            ? 'การแจ้งเตือน LINE สำหรับงวดที่ค้างชำระ'
            : 'LINE notifications for overdue installments'}
        </p>
      </div>

      <LineSettingsForm
        locale={locale}
        settings={publicSettings}
        status={status}
      />
    </div>
  );
}
