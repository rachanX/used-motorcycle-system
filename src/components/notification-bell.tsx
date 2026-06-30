'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { markNotificationReadAction } from '@/lib/supabase/notification-actions';

type NotifPreview = {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const TYPE_KEYS: Record<string, string> = {
  due_today: 'typeDueToday',
  due_tomorrow: 'typeDueTomorrow',
  due_within_7_days: 'typeDueWithin7Days',
  overdue_1_day: 'typeOverdue1Day',
  overdue_3_days: 'typeOverdue3Days',
  overdue_7_days: 'typeOverdue7Days',
  overdue_30_days: 'typeOverdue30Days'
};

export default function NotificationBell({
  locale,
  notifications,
  unreadCount
}: {
  locale: string;
  notifications: NotifPreview[];
  unreadCount: number;
}) {
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-6">{t('noNotifications')}</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markNotificationReadAction(locale, n.id)}
                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                  {t(TYPE_KEYS[n.type] ?? 'typeDueToday')}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 line-clamp-2">{n.message}</p>
              </button>
            ))}
          </div>
          <Link
            href={`/${locale}/notifications`}
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-blue-600 hover:text-blue-700 py-2.5 border-t border-slate-100 dark:border-slate-800"
          >
            {t('viewAll')}
          </Link>
        </div>
      )}
    </div>
  );
}
