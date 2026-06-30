'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck, ArrowRight, Trash2 } from 'lucide-react';
import { markNotificationReadAction, markAllNotificationsReadAction, softDeleteNotificationAction } from '@/lib/supabase/notification-actions';
import ConfirmModal from '@/components/confirm-modal';
import { useState } from 'react';
import type { NotificationRow, NotificationType } from '@/types/database.types';

type NotifWithContract = NotificationRow & { contracts: { contract_number: string } | null };

const TYPE_KEYS: Record<NotificationType, string> = {
  due_today: 'typeDueToday',
  due_tomorrow: 'typeDueTomorrow',
  due_within_7_days: 'typeDueWithin7Days',
  overdue_1_day: 'typeOverdue1Day',
  overdue_3_days: 'typeOverdue3Days',
  overdue_7_days: 'typeOverdue7Days',
  overdue_30_days: 'typeOverdue30Days'
};

const TYPE_COLORS: Record<NotificationType, string> = {
  due_today: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  due_tomorrow: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  due_within_7_days: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  overdue_1_day: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  overdue_3_days: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  overdue_7_days: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
  overdue_30_days: 'bg-red-300 text-red-900 dark:bg-red-900 dark:text-red-100'
};

export default function NotificationList({
  locale,
  notifications,
  currentType
}: {
  locale: string;
  notifications: NotifWithContract[];
  currentType: string;
}) {
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateType(type: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (type) params.set('type', type);
    else params.delete('type');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={currentType}
          onChange={(e) => updateType(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white"
        >
          <option value="">{t('allTypes')}</option>
          {Object.entries(TYPE_KEYS).map(([val, key]) => (
            <option key={val} value={val}>{t(key)}</option>
          ))}
        </select>

        <button
          onClick={() => markAllNotificationsReadAction(locale)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <CheckCheck className="h-4 w-4" />
          {t('markAllRead')}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
        {notifications.length === 0 && (
          <p className="text-center text-slate-400 py-10">{t('noNotifications')}</p>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start gap-3 p-4 ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
          >
            <div className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TYPE_COLORS[n.type]}`}>
              <Bell className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[n.type]}`}>
                  {t(TYPE_KEYS[n.type])}
                </span>
                {!n.is_read && (
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">{t('unread')}</span>
                )}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">{n.message}</p>
              <div className="flex items-center gap-3 mt-2">
                {n.contracts && (
                  <Link
                    href={`/${locale}/contracts`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('goToContract')}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    onClick={() => markNotificationReadAction(locale, n.id)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {t('markRead')}
                  </button>
                )}
                <button
                  onClick={() => setDeleting(n.id)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                  {tc('delete')}
                </button>
              </div>
            </div>
            <span className="text-xs text-slate-400 shrink-0">
              {new Date(n.created_at).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US')}
            </span>
          </div>
        ))}
      </div>

      {deleting && (
        <ConfirmModal
          message={tc('confirmDeleteMessage')}
          onConfirm={async () => {
            await softDeleteNotificationAction(locale, deleting);
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
