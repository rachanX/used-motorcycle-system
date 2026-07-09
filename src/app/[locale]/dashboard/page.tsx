import Link from 'next/link';
import { isPowerUser } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import {
  Bike, FileText, AlertTriangle, Wallet, ChevronRight,
  BadgeCheck, Banknote, Users, ArrowUpRight,
  Wrench, CalendarClock, CircleDollarSign, BookMarked
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('dashboard');
  const user = await getCurrentAppUser();
  const supabase = await createClient();
  const admin = adminClient();

  let summaryQuery = supabase.from('v_dashboard_summary').select('*');
  if (!isPowerUser(user?.role) && user?.branch_id) {
    summaryQuery = summaryQuery.eq('branch_id', user.branch_id);
  }

  let overdueQuery = supabase
    .from('v_overdue_customers')
    .select('*')
    .order('days_overdue', { ascending: false })
    .limit(6);
  if (!isPowerUser(user?.role) && user?.branch_id) {
    overdueQuery = overdueQuery.eq('branch_id', user.branch_id);
  }

  // Payments collected this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let collectedQuery = admin
    .from('payments')
    .select('amount_paid')
    .eq('status', 'paid')
    .gte('updated_at', monthStart.toISOString());

  // Upcoming payments due in next 7 days
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  let upcomingQuery = admin
    .from('payments')
    .select('amount_due, amount_paid')
    .neq('status', 'paid')
    .gte('due_date', today)
    .lte('due_date', in7);

  // Finance (on-installment) vehicle count.
  let financeSoldQuery = admin
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'financing')
    .is('deleted_at', null);
  if (!isPowerUser(user?.role) && user?.branch_id) {
    financeSoldQuery = financeSoldQuery.eq('branch_id', user.branch_id);
  }

  if (!isPowerUser(user?.role) && user?.branch_id) {
    // filter by branch via contracts join not possible here directly;
    // we fetch all and the RLS-based supabase client handles it if needed
  }

  const [
    { data: rows },
    { data: overdueCustomers },
    { data: collectedRows },
    { data: upcomingRows },
    { count: financeSoldCount }
  ] = await Promise.all([
    summaryQuery,
    overdueQuery,
    collectedQuery,
    upcomingQuery,
    financeSoldQuery
  ]);

  const branches = rows ?? [];
  const totals = branches.reduce(
    (acc, r) => ({
      totalVehicles:     acc.totalVehicles      + (r.total_vehicles       ?? 0),
      availableVehicles: acc.availableVehicles   + (r.available_vehicles   ?? 0),
      reservedVehicles:  acc.reservedVehicles    + (r.reserved_vehicles    ?? 0),
      underRepair:       acc.underRepair         + (r.under_repair_vehicles ?? 0),
      cashSoldVehicles:  acc.cashSoldVehicles    + ((r as any).cash_sold_vehicles ?? 0),
      activeContracts:   acc.activeContracts     + (r.active_contracts     ?? 0),
      completedContracts:acc.completedContracts  + (r.completed_contracts  ?? 0),
      overdueContracts:  acc.overdueContracts    + (r.overdue_contracts    ?? 0),
      outstandingBalance:acc.outstandingBalance  + Number(r.outstanding_balance ?? 0)
    }),
    { totalVehicles:0, availableVehicles:0, reservedVehicles:0, underRepair:0,
      cashSoldVehicles:0, activeContracts:0, completedContracts:0,
      overdueContracts:0, outstandingBalance:0 }
  );

  const collectedThisMonth = (collectedRows ?? []).reduce((s, r) => s + Number(r.amount_paid ?? 0), 0);
  const financeSold = financeSoldCount ?? 0;
  const dueNext7Days = (upcomingRows ?? []).reduce((s, r) => s + Number(r.amount_due ?? 0) - Number(r.amount_paid ?? 0), 0);
  const dueNext7Count = (upcomingRows ?? []).length;

  const isThai = locale === 'th';

  const fmtMoney = (n: number) =>
    n.toLocaleString(isThai ? 'th-TH' : 'en-US', {
      style: 'currency', currency: 'THB', maximumFractionDigits: 0
    });

  const now = new Date();
  const dateStr = now.toLocaleDateString(isThai ? 'th-TH' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const labelAvailable    = isThai ? 'คันพร้อมขาย' : 'available';
  const labelClosed       = isThai ? 'สัญญาปิดแล้ว' : 'closed';
  const labelReceivable   = isThai ? 'ยอดคงเหลือรวม' : 'Total receivable';
  const labelViewOverdue  = isThai ? 'ดูรายการค้างชำระ' : 'View overdue';
  const labelNoOverdue    = isThai ? 'ไม่มีลูกค้าค้างชำระ' : 'No overdue customers';
  const labelOutstanding  = isThai ? 'ยอดคงค้าง' : 'Outstanding';
  const labelContracts    = isThai ? 'สัญญา' : 'contracts';
  const labelUnderRepair  = isThai ? 'อยู่ระหว่างซ่อม' : 'Under repair';
  const labelReserved     = isThai ? 'จองแล้ว' : 'Reserved';
  const labelCollected    = isThai ? 'เก็บได้เดือนนี้' : 'Collected this month';
  const labelDueWeek      = isThai ? 'ครบกำหนด 7 วัน' : 'Due next 7 days';
  const labelInstallments = isThai ? 'งวด' : 'installments';

  const qaLabels = {
    vehicle:  isThai ? 'เพิ่มรถ'       : 'Add Vehicle',
    customer: isThai ? 'เพิ่มลูกค้า'   : 'Add Customer',
    contract: isThai ? 'สร้างสัญญา'    : 'New Contract',
    payment:  isThai ? 'บันทึกการชำระ' : 'Record Payment',
  };

  const quickActions = [
    { label: qaLabels.vehicle,  href: `/${locale}/vehicles`,          icon: Bike,     cls: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900' },
    { label: qaLabels.customer, href: `/${locale}/customers`,          icon: Users,    cls: 'bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-950 dark:hover:bg-violet-900' },
    { label: qaLabels.contract, href: `/${locale}/installments/new`,   icon: FileText, cls: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900' },
    { label: qaLabels.payment,  href: `/${locale}/payments`,           icon: Wallet,   cls: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900' },
  ];

  const maxOutstanding = Math.max(...branches.map((b) => Number(b.outstanding_balance ?? 0)), 1);

  const overdueCardBorder  = totals.overdueContracts > 0 ? 'border-red-200 dark:border-red-900' : 'border-slate-200 dark:border-slate-800';
  const overdueCardBg      = totals.overdueContracts > 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-white dark:bg-slate-900';
  const overdueLabelColor  = totals.overdueContracts > 0 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400';
  const overdueIconBg      = totals.overdueContracts > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-slate-100 dark:bg-slate-800';
  const overdueIconColor   = totals.overdueContracts > 0 ? 'text-red-600' : 'text-slate-400';
  const overdueNumberColor = totals.overdueContracts > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white';

  const urgencyClass = (days: number) => {
    if (days > 30) return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300';
    if (days > 14) return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300';
    return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300';
  };

  const branchBarColor = (hasOverdue: boolean) => hasOverdue ? 'bg-red-500' : 'bg-blue-600';

  return (
    <div className="space-y-6">

      {/* Header + quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-0.5">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${a.cls}`}>
              <a.icon className="h-3.5 w-3.5" />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Primary KPI row — 4 big cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('totalVehicles')}
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{totals.totalVehicles}</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
            {totals.availableVehicles} {labelAvailable}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('activeContracts')}
            </span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{totals.activeContracts}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <BadgeCheck className="h-3.5 w-3.5" />
            {totals.completedContracts} {labelClosed}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t('outstandingBalance')}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
            {fmtMoney(totals.outstandingBalance)}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Wallet className="h-3.5 w-3.5" />
            {labelReceivable}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${overdueCardBorder} ${overdueCardBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase tracking-wide ${overdueLabelColor}`}>
              {t('overdueCustomers')}
            </span>
          </div>
          <p className={`text-3xl font-bold ${overdueNumberColor}`}>{totals.overdueContracts}</p>
          <Link href={`/${locale}/payments?due=overdue`}
            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium">
            {labelViewOverdue}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Financial pulse strip — collected this month + due next 7 days */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {labelCollected}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmtMoney(collectedThisMonth)}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <CircleDollarSign className="h-3.5 w-3.5" />
            {isThai ? 'ยอดรับชำระสะสม' : 'Month to date'}
          </div>
        </div>

        <Link href={`/${locale}/payments`}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {labelDueWeek}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmtMoney(dueNext7Days)}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <CalendarClock className="h-3.5 w-3.5" />
            {dueNext7Count > 0 ? `${dueNext7Count} ${labelInstallments}` : (isThai ? 'ไม่มีงวดที่ครบกำหนด' : 'No installments due')}
          </div>
        </Link>
      </div>

      {/* Inventory status row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950">
            <Bike className="h-4 w-4 text-emerald-600" />
          </span>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('availableVehicles')}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{totals.availableVehicles}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950">
            <Wrench className="h-4 w-4 text-orange-500" />
          </span>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{labelUnderRepair}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{totals.underRepair}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950">
            <Banknote className="h-4 w-4 text-green-600" />
          </span>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('cashSoldVehicles')}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{totals.cashSoldVehicles}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950">
            <Banknote className="h-4 w-4 text-indigo-600" />
          </span>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{isThai ? 'ขายไฟเเนนซ์' : 'Finance'}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{financeSold}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <BadgeCheck className="h-4 w-4 text-slate-500" />
          </span>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('closedContracts')}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{totals.completedContracts}</p>
          </div>
        </div>
      </div>

      {/* Bottom: branch breakdown + overdue customers */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {branches.length > 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('branchBreakdown')}</h2>
              <span className="text-xs text-slate-400">{labelOutstanding}</span>
            </div>
            <div className="space-y-5">
              {branches.map((b) => {
                const pct = Math.round((Number(b.outstanding_balance ?? 0) / maxOutstanding) * 100);
                const hasOverdue = (b.overdue_contracts ?? 0) > 0;
                return (
                  <div key={b.branch_id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{b.branch_name}</span>
                        {hasOverdue && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 dark:bg-red-950 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {b.overdue_contracts}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {fmtMoney(Number(b.outstanding_balance ?? 0))}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${branchBarColor(hasOverdue)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[11px] text-slate-400">
                      <span>{b.available_vehicles ?? 0} {labelAvailable}</span>
                      <span>&middot;</span>
                      <span>{b.active_contracts ?? 0} {labelContracts}</span>
                      {(b.under_repair_vehicles ?? 0) > 0 && (
                        <>
                          <span>&middot;</span>
                          <span className="text-orange-400">{b.under_repair_vehicles} {labelUnderRepair}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 ${branches.length === 0 ? 'lg:col-span-5' : 'lg:col-span-3'}`}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t('topOverdue')}</h2>
            <Link href={`/${locale}/payments?due=overdue`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
              {t('viewAllOverdue')}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {!overdueCustomers || overdueCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-3">
                <BadgeCheck className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{labelNoOverdue}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {overdueCustomers.map((o) => {
                const initials = `${o.first_name?.[0] ?? ''}${o.last_name?.[0] ?? ''}`.toUpperCase();
                const uc = urgencyClass(o.days_overdue);
                return (
                  <Link
                    key={o.payment_id}
                    href={`/${locale}/payments/${o.contract_id ?? ''}`}
                    className="flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${uc}`}>
                      {initials || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {o.first_name} {o.last_name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{o.contract_number} &middot; {o.phone_number}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {fmtMoney(Number(o.amount_outstanding))}
                      </p>
                      <span className={`inline-block mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${uc}`}>
                        {t('daysOverdue', { days: o.days_overdue })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
