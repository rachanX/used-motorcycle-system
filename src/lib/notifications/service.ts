import { notificationAdmin, getSettings } from './settings';
import { LineProvider } from './providers/line';
import type {
  NotificationProvider,
  NotificationSettings,
  OverdueRow,
  RunSummary,
  TriggerSource,
} from './types';

/** Today's date in the configured timezone as 'YYYY-MM-DD'. */
export function localDate(timezone = 'Asia/Bangkok'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Current 'HH:MM' in the configured timezone. */
export function localTime(timezone = 'Asia/Bangkok'): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/** Build the LINE provider from settings, or null if not fully configured. */
function buildProvider(s: NotificationSettings): NotificationProvider | null {
  if (!s.channel_access_token || !s.destination_id) return null;
  return new LineProvider(s.channel_access_token);
}

/** The ⚠️ overdue alert message body. */
export function formatOverdueMessage(row: OverdueRow): string {
  const name = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
  return [
    '⚠️ Overdue Installment Alert',
    `Contract No.: ${row.contract_number}`,
    `Customer: ${name || '-'}`,
    `Stock Code: ${row.stock_code ?? '-'}`,
    `Brand: ${row.brand ?? '-'}`,
    `Model: ${row.model ?? '-'}`,
    `License Plate: ${row.license_plate ?? '-'}`,
    `Phone: ${row.phone_number ?? '-'}`,
    `Due Date: ${row.due_date}`,
    `Overdue: ${row.overdue_days} day(s)`,
    '',
    'Please contact the customer for payment follow-up.',
  ].join('\n');
}

/** The ⚙️ test message body. */
export function formatTestMessage(timezone: string): string {
  const now = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date()).replace(',', '');
  return [
    '⚙️ Test Notification',
    'LINE Notification has been configured successfully.',
    `Current Time: ${now}`,
  ].join('\n');
}

/**
 * Fetch overdue installments (>= min_overdue_days), collapsed to ONE row per
 * contract (the most overdue installment represents the contract).
 */
async function getOverdueByContract(minOverdueDays: number): Promise<OverdueRow[]> {
  const admin = notificationAdmin();
  const { data, error } = await admin
    .from('v_overdue_installments')
    .select('*')
    .gte('overdue_days', minOverdueDays)
    .order('overdue_days', { ascending: false });
  if (error || !data) return [];

  const byContract = new Map<string, OverdueRow>();
  for (const r of data as OverdueRow[]) {
    // rows are sorted most-overdue first, so the first seen per contract wins
    if (!byContract.has(r.contract_id)) byContract.set(r.contract_id, r);
  }
  return [...byContract.values()];
}

/** Contract ids that already got a successful overdue notification today. */
async function alreadyNotifiedToday(contractIds: string[], sentOn: string): Promise<Set<string>> {
  if (contractIds.length === 0) return new Set();
  const admin = notificationAdmin();
  const { data } = await admin
    .from('notification_logs')
    .select('contract_id')
    .eq('status', 'success')
    .eq('notification_type', 'overdue')
    .eq('sent_on', sentOn)
    .in('contract_id', contractIds);
  return new Set((data ?? []).map((r: { contract_id: string }) => r.contract_id));
}

async function logNotification(row: Record<string, unknown>): Promise<void> {
  try {
    await notificationAdmin().from('notification_logs').insert(row);
  } catch {
    /* logging must never break the run */
  }
}

/**
 * Core overdue run. Sends at most one notification per contract per day,
 * skips contracts already notified today, logs every attempt, and never
 * throws — a single failure won't stop the batch.
 */
export async function runOverdueNotifications(source: TriggerSource): Promise<RunSummary> {
  const settings = await getSettings();
  const empty: RunSummary = { ran: false, totalOverdue: 0, sent: 0, failed: 0, skipped: 0 };

  if (!settings) return { ...empty, reason: 'settings_missing' };
  // The scheduler honours the enable toggle; manual runs are explicit admin acts.
  if (source === 'scheduler' && !settings.enabled) return { ...empty, reason: 'disabled' };

  const provider = buildProvider(settings);
  if (!provider) return { ...empty, reason: 'not_configured' };

  const sentOn = localDate(settings.timezone);
  const overdue = await getOverdueByContract(settings.min_overdue_days);
  const notified = await alreadyNotifiedToday(overdue.map((r) => r.contract_id), sentOn);

  let sent = 0, failed = 0, skipped = 0;

  for (const row of overdue) {
    if (notified.has(row.contract_id)) { skipped++; continue; }

    const result = await provider.send(
      { type: settings.destination_type, id: settings.destination_id! },
      formatOverdueMessage(row)
    );

    await logNotification({
      contract_id: row.contract_id,
      installment_id: row.installment_id,
      notification_type: 'overdue',
      channel: provider.channel,
      overdue_days: row.overdue_days,
      destination: settings.destination_id,
      status: result.ok ? 'success' : 'failed',
      line_response: result.response ?? null,
      error_message: result.ok ? null : (result.error ?? 'unknown'),
      trigger_source: source,
      sent_on: sentOn,
    });

    if (result.ok) sent++; else failed++;
  }

  return { ran: true, totalOverdue: overdue.length, sent, failed, skipped };
}

/** Send the configured test message immediately. Returns the raw LINE response. */
export async function sendTestNotification(): Promise<{
  ok: boolean; error?: string; response?: unknown;
}> {
  const settings = await getSettings();
  if (!settings) return { ok: false, error: 'settings_missing' };
  const provider = buildProvider(settings);
  if (!provider) return { ok: false, error: 'not_configured' };

  const result = await provider.send(
    { type: settings.destination_type, id: settings.destination_id! },
    formatTestMessage(settings.timezone)
  );

  await logNotification({
    notification_type: 'test',
    channel: provider.channel,
    destination: settings.destination_id,
    status: result.ok ? 'success' : 'failed',
    line_response: result.response ?? null,
    error_message: result.ok ? null : (result.error ?? 'unknown'),
    trigger_source: 'test',
    sent_on: localDate(settings.timezone),
  });

  return { ok: result.ok, error: result.error, response: result.response };
}

/** Whether the daily scheduler should fire now, and claim the day if so. */
export async function shouldRunSchedulerNow(): Promise<{ run: boolean; reason?: string }> {
  const settings = await getSettings();
  if (!settings) return { run: false, reason: 'settings_missing' };
  if (!settings.enabled) return { run: false, reason: 'disabled' };

  const today = localDate(settings.timezone);
  if (settings.last_scheduled_run_date === today) return { run: false, reason: 'already_ran_today' };

  const now = localTime(settings.timezone);            // 'HH:MM'
  const target = settings.notify_time.slice(0, 5);     // 'HH:MM'
  if (now < target) return { run: false, reason: 'before_scheduled_time' };

  // Atomically claim today's run so concurrent scheduler pings can't double-fire.
  const { data, error } = await notificationAdmin()
    .from('notification_settings')
    .update({ last_scheduled_run_date: today })
    .eq('id', settings.id)
    .neq('last_scheduled_run_date', today)   // no-op if another ping just claimed it
    .select('id');
  if (error) return { run: false, reason: 'claim_failed' };
  if (!data || data.length === 0) return { run: false, reason: 'already_ran_today' };

  return { run: true };
}

/** Dashboard status counters for the Settings page. */
export async function getNotificationStatus(): Promise<{
  lastSentAt: string | null;
  lastSuccessAt: string | null;
  lastFailedAt: string | null;
  sentToday: number;
  overdueToday: number;
}> {
  const admin = notificationAdmin();
  const settings = await getSettings();
  const today = localDate(settings?.timezone ?? 'Asia/Bangkok');

  const [lastAny, lastOk, lastErr, sentTodayRes, overdue] = await Promise.all([
    admin.from('notification_logs').select('sent_at').order('sent_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('notification_logs').select('sent_at').eq('status', 'success').order('sent_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('notification_logs').select('sent_at').eq('status', 'failed').order('sent_at', { ascending: false }).limit(1).maybeSingle(),
    admin.from('notification_logs').select('id', { count: 'exact', head: true }).eq('status', 'success').eq('sent_on', today),
    getOverdueByContract(settings?.min_overdue_days ?? 1),
  ]);

  return {
    lastSentAt: (lastAny.data as { sent_at: string } | null)?.sent_at ?? null,
    lastSuccessAt: (lastOk.data as { sent_at: string } | null)?.sent_at ?? null,
    lastFailedAt: (lastErr.data as { sent_at: string } | null)?.sent_at ?? null,
    sentToday: sentTodayRes.count ?? 0,
    overdueToday: overdue.length,
  };
}
