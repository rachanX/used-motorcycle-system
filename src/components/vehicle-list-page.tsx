import { getTranslations } from 'next-intl/server';
import { isPowerUser } from '@/lib/auth/roles';
import Link from 'next/link';
import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { Pencil, Trash2, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  under_repair: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
};

const STATUS_TH: Record<string, string> = {
  available: 'พร้อมขาย',
  under_repair: 'ระหว่างซ่อม'
};

const STATUS_EN: Record<string, string> = {
  available: 'Available',
  under_repair: 'Under Repair'
};

export default async function VehicleListPage({
  locale,
  prefix,
  searchParams
}: {
  locale: string;
  prefix?: string;   // undefined = overview (all prefixes)
  searchParams: Record<string, string>;
}) {
  const t = await getTranslations('vehicles');
  const tc = await getTranslations('common');
  const me = await getCurrentAppUser();
  const supabase = await createClient();

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const PAGE_SIZE = 20;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const sortDir = searchParams.sort === 'desc' ? 'desc' : 'asc';

  let query = supabase
    .from('vehicles')
    .select('*, branches(branch_name)', { count: 'exact' })
    .in('status', ['available', 'under_repair'])   // only active stock
    .is('deleted_at', null)
    .order('stock_num', { ascending: sortDir === 'asc', nullsFirst: false })
    .order('stock_code', { ascending: sortDir === 'asc' })
    .range(from, to);

  if (!isPowerUser(me?.role) && me?.branch_id) {
    query = query.eq('branch_id', me.branch_id);
  }

  if (prefix) {
    query = query.eq('stock_prefix', prefix);
  }

  if (searchParams.q) {
    const term = searchParams.q.replace(/[%]/g, '');
    query = query.or(
      `stock_code.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,license_plate.ilike.%${term}%,vin_number.ilike.%${term}%`
    );
  }

  const { data: vehicles, count } = await query;
  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;
  const isThai = locale === 'th';

  const basePath = prefix
    ? `/${locale}/vehicles/${prefix.toLowerCase()}`
    : `/${locale}/vehicles/overview`;
  const sortHref = (dir: string) => {
    const p = new URLSearchParams();
    if (searchParams.q) p.set('q', searchParams.q);
    p.set('sort', dir);
    return `${basePath}?${p.toString()}`;
  };
  const sortBtn = (active: boolean) =>
    `inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium ${
      active
        ? 'border-blue-600 bg-blue-600 text-white'
        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-slate-400">{t('totalResults', { count: count ?? 0 })}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">{isThai ? 'เรียงตามรหัสสต็อก' : 'Sort by stock code'}:</span>
          <Link href={sortHref('asc')} className={sortBtn(sortDir === 'asc')}>
            {isThai ? 'น้อย → มาก' : 'Min → Max'}
          </Link>
          <Link href={sortHref('desc')} className={sortBtn(sortDir === 'desc')}>
            {isThai ? 'มาก → น้อย' : 'Max → Min'}
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-medium">{t('stockCode')}</th>
              <th className="px-4 py-3 font-medium">{t('brand')} / {t('model')}</th>
              <th className="px-4 py-3 font-medium">{t('year')}</th>
              <th className="px-4 py-3 font-medium">{t('licensePlate')}</th>
              <th className="px-4 py-3 font-medium">{t('actualCost')}</th>
              <th className="px-4 py-3 font-medium">{t('branch')}</th>
              <th className="px-4 py-3 font-medium">{tc('status')}</th>
              <th className="px-4 py-3 font-medium text-right">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {(!vehicles || vehicles.length === 0) && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">{t('noVehicles')}</td></tr>
            )}
            {(vehicles ?? []).map((v: any) => (
              <tr key={v.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{v.stock_code}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">
                  {v.brand} {v.model}
                  {v.sub_model && <span className="text-slate-400"> · {v.sub_model}</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.year}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{v.license_plate || '—'}</td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">
                  {v.actual_cost != null
                    ? Number(v.actual_cost).toLocaleString(isThai ? 'th-TH' : 'en-US', {
                        style: 'currency', currency: 'THB', maximumFractionDigits: 0
                      })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  {(v.branches as any)?.branch_name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[v.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {isThai ? (STATUS_TH[v.status] ?? v.status) : (STATUS_EN[v.status] ?? v.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${locale}/vehicles/${v.id}`}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {tc('actions')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>{isThai ? 'หน้า' : 'Page'} {page} / {totalPages}</span>
        </div>
      )}
    </div>
  );
}
