import { notificationAdmin } from './settings';

export interface HistoryRow {
  id: string;
  sent_at: string;
  sent_on: string;
  notification_type: string;
  channel: string;
  overdue_days: number | null;
  destination: string | null;
  status: string;
  error_message: string | null;
  trigger_source: string;
  contract_id: string | null;
  contract_number: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  stock_code: string | null;
  brand: string | null;
  model: string | null;
  license_plate: string | null;
}

export interface HistoryFilters {
  from?: string;      // YYYY-MM-DD (sent_on >=)
  to?: string;        // YYYY-MM-DD (sent_on <=)
  status?: string;    // success | failed | skipped
  q?: string;         // contract number / customer name search
  limit?: number;
  offset?: number;
}

/** Query the notification history view (service-role; developer-only pages). */
export async function queryNotificationHistory(
  f: HistoryFilters
): Promise<{ rows: HistoryRow[]; count: number }> {
  const admin = notificationAdmin();
  let q = admin
    .from('v_notification_history')
    .select('*', { count: 'exact' })
    .order('sent_at', { ascending: false });

  if (f.from) q = q.gte('sent_on', f.from);
  if (f.to) q = q.lte('sent_on', f.to);
  if (f.status) q = q.eq('status', f.status);
  if (f.q) {
    const s = f.q.replace(/[%,]/g, '');
    q = q.or(`contract_number.ilike.%${s}%,first_name.ilike.%${s}%,last_name.ilike.%${s}%`);
  }
  if (f.limit != null) q = q.range(f.offset ?? 0, (f.offset ?? 0) + f.limit - 1);

  const { data, count } = await q;
  return { rows: (data as HistoryRow[]) ?? [], count: count ?? 0 };
}

export function customerName(r: HistoryRow): string {
  return `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || '-';
}
