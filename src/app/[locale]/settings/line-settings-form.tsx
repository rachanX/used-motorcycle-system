'use client';

import { useActionState } from 'react';
import {
  updateNotificationSettingsAction,
  sendTestNotificationAction,
  type SettingsFormState,
  type TestState,
} from '@/lib/notifications/actions';
import type { PublicNotificationSettings } from '@/lib/notifications/types';

type Status = {
  lastSentAt: string | null;
  lastSuccessAt: string | null;
  lastFailedAt: string | null;
  sentToday: number;
  overdueToday: number;
};

function fmt(ts: string | null, isThai: boolean) {
  if (!ts) return isThai ? '—' : '—';
  return new Date(ts).toLocaleString(isThai ? 'th-TH' : 'en-GB', { timeZone: 'Asia/Bangkok' });
}

export default function LineSettingsForm({
  locale,
  settings,
  status,
}: {
  locale: string;
  settings: PublicNotificationSettings;
  status: Status;
}) {
  const isThai = locale === 'th';
  const [saveState, saveAction, saving] = useActionState<SettingsFormState, FormData>(
    updateNotificationSettingsAction.bind(null, locale),
    {}
  );
  const [testState, testAction, testing] = useActionState<TestState, FormData>(
    sendTestNotificationAction.bind(null, locale),
    {}
  );

  const L = (th: string, en: string) => (isThai ? th : en);

  return (
    <div className="space-y-6">
      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label={L('ส่งแล้ววันนี้', 'Sent today')} value={String(status.sentToday)} />
        <StatCard label={L('ค้างชำระวันนี้', 'Overdue today')} value={String(status.overdueToday)} />
        <StatCard label={L('สำเร็จล่าสุด', 'Last success')} value={fmt(status.lastSuccessAt, isThai)} small />
        <StatCard label={L('ส่งล่าสุด', 'Last sent')} value={fmt(status.lastSentAt, isThai)} small />
        <StatCard label={L('ล้มเหลวล่าสุด', 'Last failed')} value={fmt(status.lastFailedAt, isThai)} small />
      </div>

      {/* Settings form */}
      <form action={saveAction} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          {L('ตั้งค่าการแจ้งเตือน LINE', 'LINE Notification Settings')}
        </h2>

        <label className="flex items-center gap-3">
          <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-4 w-4" />
          <span className="text-sm text-slate-700 dark:text-slate-200">
            {L('เปิดการแจ้งเตือนอัตโนมัติ', 'Enable automatic notifications')}
          </span>
        </label>

        <Field label={L('Channel Access Token', 'Channel Access Token')}>
          <input
            type="password"
            name="channel_access_token"
            autoComplete="off"
            placeholder={settings.hasToken ? L('•••••• (ตั้งค่าแล้ว — เว้นว่างเพื่อคงเดิม)', '•••••• (set — leave blank to keep)') : L('วาง token ที่นี่', 'Paste token here')}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={L('ประเภทปลายทาง', 'Destination Type')}>
            <select name="destination_type" defaultValue={settings.destination_type} className="input">
              <option value="user">{L('ผู้ใช้ (User)', 'User')}</option>
              <option value="group">{L('กลุ่ม (Group)', 'Group')}</option>
              <option value="room">{L('ห้อง (Room)', 'Room')}</option>
            </select>
          </Field>
          <Field label={L('รหัสปลายทาง (Destination ID)', 'Destination ID')}>
            <input name="destination_id" defaultValue={settings.destination_id ?? ''} className="input" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={L('เวลาแจ้งเตือน', 'Notification time')}>
            <input type="time" name="notify_time" defaultValue={settings.notify_time} className="input" />
          </Field>
          <Field label={L('ค้างชำระขั้นต่ำ (วัน)', 'Minimum overdue days')}>
            <input type="number" name="min_overdue_days" min={0} max={365} defaultValue={settings.min_overdue_days} className="input" />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? L('กำลังบันทึก…', 'Saving…') : L('บันทึก', 'Save')}
          </button>
          {saveState.ok && <span className="text-sm text-emerald-600">{L('บันทึกแล้ว', 'Saved')}</span>}
          {saveState.error && <span className="text-sm text-red-600">{L('บันทึกไม่สำเร็จ', 'Save failed')}: {saveState.error}</span>}
        </div>

        <p className="text-xs text-slate-400">
          {L(
            'Token จะถูกเก็บอย่างปลอดภัยฝั่งเซิร์ฟเวอร์เท่านั้น และไม่ถูกส่งกลับมายังเบราว์เซอร์',
            'The token is stored securely on the server and is never sent back to the browser.'
          )}
        </p>
      </form>

      {/* Send test */}
      <form action={testAction} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">{L('ทดสอบการแจ้งเตือน', 'Send Test Notification')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {L('ส่งข้อความตัวอย่างไปยังปลายทางที่ตั้งค่าไว้ทันที', 'Send a sample message to the configured destination right now.')}
        </p>
        <button
          type="submit"
          disabled={testing}
          className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          {testing ? L('กำลังส่ง…', 'Sending…') : L('ส่งการแจ้งเตือนทดสอบ', 'Send Test Notification')}
        </button>
        {testState.ok && <p className="text-sm text-emerald-600">{L('สำเร็จ', 'Success')}</p>}
        {testState.error && <p className="text-sm text-red-600">{L('ล้มเหลว', 'Failed')}: {testState.error}</p>}
        {testState.response && (
          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-300">
            {testState.response}
          </pre>
        )}
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 font-semibold text-slate-900 dark:text-white ${small ? 'text-xs' : 'text-xl'}`}>{value}</p>
    </div>
  );
}
