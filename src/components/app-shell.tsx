'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard, Bike, Users, FileText, CreditCard,
  Bell, Building2, ShieldCheck, Settings, LogOut,
  Menu, X, Sun, Moon, ChevronDown, ChevronRight,
  Archive, MessageCircle
} from 'lucide-react';
import LanguageSwitcher from './language-switcher';
import NotificationBell from './notification-bell';
import { logoutAction } from '@/lib/supabase/auth-actions';
import type { AppUser } from '@/types/database.types';

type NotifPreview = { id: string; type: string; message: string; is_read: boolean; created_at: string };

export default function AppShell({
  locale,
  user,
  recentNotifications,
  unreadCount,
  prefixes,
  children
}: {
  locale: string;
  user: AppUser;
  recentNotifications: NotifPreview[];
  unreadCount: number;
  prefixes: { prefix: string; label: string; count?: number }[];
  children: React.ReactNode;
}) {
  const tNav = useTranslations('nav');
  const tAuth = useTranslations('auth');
  const tc = useTranslations('common');
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [bikesOpen, setBikesOpen] = useState(false);

  const isDeveloper = user.role === 'developer';

  useEffect(() => {
    document.documentElement.lang = locale;
    setIsDark(document.documentElement.classList.contains('dark'));
    // auto-open bikes accordion if on a vehicle sub-route
    if (pathname?.includes(`/${locale}/vehicles`)) setBikesOpen(true);
  }, [locale, pathname]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  function isActive(href: string) {
    return pathname?.startsWith(href);
  }

  const linkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile topbar */}
      <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button onClick={() => setMobileOpen(true)} aria-label="menu">
          <Menu className="h-6 w-6 text-slate-700 dark:text-slate-300" />
        </button>
        <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
          <Image src="/logo.png" alt={tc('appName')} width={24} height={24} className="rounded" />
          {tc('appName')}
        </span>
        <div className="flex items-center gap-1">
          <NotificationBell locale={locale} notifications={recentNotifications} unreadCount={unreadCount} />
          <LanguageSwitcher locale={locale} />
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed lg:sticky inset-y-0 lg:top-0 left-0 z-40 w-64 h-screen flex flex-col transform bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <span className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm truncate">
              <Image src="/logo.png" alt={tc('appName')} width={28} height={28} className="rounded shrink-0" />
              {tc('appName')}
            </span>
            <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-0.5">

            {/* Dashboard */}
            <Link href={`/${locale}/dashboard`} onClick={() => setMobileOpen(false)}
              className={linkClass(isActive(`/${locale}/dashboard`))}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span className="truncate">{tNav('dashboard')}</span>
            </Link>

            {/* Motorcycles accordion */}
            <div>
              <button
                onClick={() => setBikesOpen(o => !o)}
                className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(`/${locale}/vehicles`)
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Bike className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">{tNav('vehicles')}</span>
                {bikesOpen
                  ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              </button>

              {bikesOpen && (
                <div className="ml-7 mt-0.5 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800 pl-3">
                  <Link href={`/${locale}/vehicles/overview`} onClick={() => setMobileOpen(false)}
                    className={linkClass(pathname === `/${locale}/vehicles/overview`)}>
                    <span className="truncate">{tNav('motorcyclesOverview')}</span>
                  </Link>
                  {prefixes.map(p => (
                    <Link key={p.prefix}
                      href={`/${locale}/vehicles/${p.prefix.toLowerCase()}`}
                      onClick={() => setMobileOpen(false)}
                      className={linkClass(pathname === `/${locale}/vehicles/${p.prefix.toLowerCase()}`)}>
                      <span className="truncate">{p.label} ({p.count ?? 0})</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Installment Customers — single flat link */}
            <Link href={`/${locale}/installments`} onClick={() => setMobileOpen(false)}
              className={linkClass(isActive(`/${locale}/installments`))}>
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="truncate">{tNav('installmentCustomers')}</span>
            </Link>

            {/* Record Payment */}
            <Link href={`/${locale}/payments`} onClick={() => setMobileOpen(false)}
              className={linkClass(isActive(`/${locale}/payments`))}>
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{tNav('payments')}</span>
            </Link>

            {/* Sold Vehicles */}
            <Link href={`/${locale}/sold`} onClick={() => setMobileOpen(false)}
              className={linkClass(isActive(`/${locale}/sold`))}>
              <Archive className="h-4 w-4 shrink-0" />
              <span className="truncate">{tNav('soldVehicles')}</span>
            </Link>

            {/* Divider */}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            <Link href={`/${locale}/notifications`} onClick={() => setMobileOpen(false)}
              className={linkClass(isActive(`/${locale}/notifications`))}>
              <Bell className="h-4 w-4 shrink-0" />
              <span className="truncate">{tNav('notifications')}</span>
            </Link>

            <Link href={`/${locale}/branches`} onClick={() => setMobileOpen(false)}
              className={linkClass(isActive(`/${locale}/branches`))}>
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{tNav('branches')}</span>
            </Link>

            {isDeveloper && (
              <>
                <Link href={`/${locale}/users`} onClick={() => setMobileOpen(false)}
                  className={linkClass(isActive(`/${locale}/users`))}>
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tNav('users')}</span>
                </Link>
                <Link href={`/${locale}/audit-logs`} onClick={() => setMobileOpen(false)}
                  className={linkClass(isActive(`/${locale}/audit-logs`))}>
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tNav('auditLogs')}</span>
                </Link>
                <Link href={`/${locale}/settings`} onClick={() => setMobileOpen(false)}
                  className={linkClass(isActive(`/${locale}/settings`))}>
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tNav('settings')}</span>
                </Link>
                <Link href={`/${locale}/notification-history`} onClick={() => setMobileOpen(false)}
                  className={linkClass(isActive(`/${locale}/notification-history`))}>
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate">{locale === 'th' ? 'ประวัติแจ้งเตือน' : 'Notification History'}</span>
                </Link>
              </>
            )}
          </nav>

          {/* Sidebar footer */}
          <div className="shrink-0 p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="hidden lg:flex items-center justify-between">
              <LanguageSwitcher locale={locale} />
              <div className="flex items-center gap-1">
                <NotificationBell locale={locale} notifications={recentNotifications} unreadCount={unreadCount} />
                <button onClick={toggleTheme}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="toggle theme">
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.full_name}</p>
                <p className="text-xs text-slate-500 truncate">{user.role === 'developer' ? 'Developer' : 'Staff'}</p>
              </div>
              <form action={logoutAction.bind(null, locale)}>
                <button type="submit"
                  className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  aria-label={tAuth('logout')}>
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        <main className="flex-1 min-w-0 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
