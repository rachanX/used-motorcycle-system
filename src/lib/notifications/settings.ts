import { createClient } from '@supabase/supabase-js';
import type { NotificationSettings, PublicNotificationSettings } from './types';

/**
 * Untyped service-role client scoped to the notification tables.
 *
 * We deliberately do NOT use the generated Database generic here: the new
 * notification_* tables aren't in the hand-maintained types, and keeping this
 * client untyped avoids having to regenerate/modify database.types.ts (which
 * would be a larger, riskier change). Service role bypasses RLS, which is how
 * the token stays reachable ONLY from the backend.
 */
export function notificationAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Full settings incl. the secret token — SERVER ONLY. Never return to a client. */
export async function getSettings(): Promise<NotificationSettings | null> {
  const { data } = await notificationAdmin()
    .from('notification_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  return (data as NotificationSettings) ?? null;
}

/** Settings safe to hand to the browser — strips the token, exposes only hasToken. */
export function toPublicSettings(s: NotificationSettings | null): PublicNotificationSettings {
  return {
    enabled: s?.enabled ?? false,
    hasToken: !!(s?.channel_access_token && s.channel_access_token.length > 0),
    destination_type: s?.destination_type ?? 'user',
    destination_id: s?.destination_id ?? null,
    notify_time: (s?.notify_time ?? '09:00:00').slice(0, 5), // HH:MM
    min_overdue_days: s?.min_overdue_days ?? 1,
    timezone: s?.timezone ?? 'Asia/Bangkok',
  };
}

export interface SettingsUpdate {
  enabled?: boolean;
  channel_access_token?: string | null; // only applied when provided (non-undefined)
  destination_type?: 'user' | 'group' | 'room';
  destination_id?: string | null;
  notify_time?: string;      // 'HH:MM'
  min_overdue_days?: number;
}

/** Update the singleton settings row. Token only overwritten when explicitly passed. */
export async function updateSettings(patch: SettingsUpdate): Promise<{ error?: string }> {
  const admin = notificationAdmin();
  const current = await getSettings();
  if (!current) return { error: 'settings_missing' };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.destination_type !== undefined) update.destination_type = patch.destination_type;
  if (patch.destination_id !== undefined) update.destination_id = patch.destination_id || null;
  if (patch.notify_time !== undefined) update.notify_time = patch.notify_time;
  if (patch.min_overdue_days !== undefined) update.min_overdue_days = patch.min_overdue_days;
  // Only touch the token when a non-empty value is supplied, so re-saving the
  // form without re-typing the token doesn't wipe it.
  if (patch.channel_access_token !== undefined && patch.channel_access_token !== '') {
    update.channel_access_token = patch.channel_access_token;
  }

  const { error } = await admin
    .from('notification_settings')
    .update(update)
    .eq('id', current.id);
  return error ? { error: error.message } : {};
}
