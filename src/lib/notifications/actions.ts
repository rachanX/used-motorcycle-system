'use server';

import { getCurrentAppUser } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { updateSettings } from './settings';
import { sendTestNotification, runOverdueNotifications } from './service';

async function assertDeveloper() {
  const me = await getCurrentAppUser();
  if (!me || me.role !== 'developer') throw new Error('Forbidden');
  return me;
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  channel_access_token: z.string().optional(),      // blank = keep existing
  destination_type: z.enum(['user', 'group', 'room']),
  destination_id: z.string().optional().nullable(),
  notify_time: z.string().regex(/^\d{2}:\d{2}$/, 'time'),
  min_overdue_days: z.coerce.number().int().min(0).max(365),
});

export interface SettingsFormState { ok?: boolean; error?: string; }

export async function updateNotificationSettingsAction(
  locale: string,
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  try {
    await assertDeveloper();
  } catch {
    return { error: 'forbidden' };
  }

  const parsed = settingsSchema.safeParse({
    enabled: formData.get('enabled') === 'on',
    channel_access_token: (formData.get('channel_access_token') as string) ?? '',
    destination_type: formData.get('destination_type'),
    destination_id: (formData.get('destination_id') as string) || null,
    notify_time: formData.get('notify_time'),
    min_overdue_days: formData.get('min_overdue_days'),
  });
  if (!parsed.success) return { error: 'invalid_input' };

  const res = await updateSettings(parsed.data);
  if (res.error) return { error: res.error };

  revalidatePath(`/${locale}/settings`);
  return { ok: true };
}

export interface TestState { ok?: boolean; error?: string; response?: string; }

export async function sendTestNotificationAction(
  _locale: string,
  _prev: TestState,
  _formData: FormData
): Promise<TestState> {
  try {
    await assertDeveloper();
  } catch {
    return { error: 'forbidden' };
  }

  const res = await sendTestNotification();
  return {
    ok: res.ok,
    error: res.ok ? undefined : (res.error ?? 'failed'),
    response: res.response ? JSON.stringify(res.response) : undefined,
  };
}

export interface SendNowState { ok?: boolean; error?: string; sent?: number; failed?: number; skipped?: number; total?: number; }

export async function sendNowAction(
  locale: string,
  _prev: SendNowState,
  _formData: FormData
): Promise<SendNowState> {
  try {
    await assertDeveloper();
  } catch {
    return { error: 'forbidden' };
  }

  const s = await runOverdueNotifications('manual');
  if (!s.ran) return { error: s.reason ?? 'not_ran' };

  revalidatePath(`/${locale}/settings`);
  revalidatePath(`/${locale}/notification-history`);
  return { ok: true, sent: s.sent, failed: s.failed, skipped: s.skipped, total: s.totalOverdue };
}
