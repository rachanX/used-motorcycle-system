// ============================================================================
// Notification system — shared types.
//
// The system is built around a provider abstraction so that new channels
// (email, SMS, Telegram, ...) can be added later WITHOUT changing the overdue
// business logic in service.ts. A provider only needs to implement `send()`.
// ============================================================================

export type NotificationChannel = 'line' | 'email' | 'sms' | 'telegram' | 'other';

/** A resolved destination for a channel (e.g. a LINE user/group/room id). */
export interface NotificationTarget {
  type: string;   // 'user' | 'group' | 'room' for LINE
  id: string;
}

/** Result returned by every provider's send() — uniform across channels. */
export interface ProviderResult {
  ok: boolean;
  httpStatus: number | null;
  response: unknown;      // raw provider response (stored in notification_logs.line_response)
  error?: string;
}

/** The contract every notification provider must satisfy. */
export interface NotificationProvider {
  readonly channel: NotificationChannel;
  /** Send a plain-text message. Must never throw — always resolve a result. */
  send(target: NotificationTarget, text: string): Promise<ProviderResult>;
}

/** Persisted settings (server-side shape, includes the secret token). */
export interface NotificationSettings {
  id: string;
  enabled: boolean;
  channel_access_token: string | null;
  destination_type: 'user' | 'group' | 'room';
  destination_id: string | null;
  notify_time: string;        // 'HH:MM:SS'
  min_overdue_days: number;
  timezone: string;
  language: 'th' | 'en';
  last_scheduled_run_date: string | null;
}

/** Settings safe to send to the browser — NO token, just whether one is set. */
export interface PublicNotificationSettings {
  enabled: boolean;
  hasToken: boolean;
  destination_type: 'user' | 'group' | 'room';
  destination_id: string | null;
  notify_time: string;        // 'HH:MM'
  min_overdue_days: number;
  timezone: string;
  language: 'th' | 'en';
}

/** One unpaid, past-due installment joined with display fields. */
export interface OverdueRow {
  installment_id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  overdue_days: number;
  contract_number: string;
  branch_id: string | null;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  stock_code: string | null;
  brand: string | null;
  model: string | null;
  license_plate: string | null;
}

export type TriggerSource = 'scheduler' | 'manual' | 'test';

export interface RunSummary {
  ran: boolean;
  reason?: string;          // why it didn't run (disabled / not configured / no time yet)
  totalOverdue: number;
  sent: number;
  failed: number;
  skipped: number;
}
