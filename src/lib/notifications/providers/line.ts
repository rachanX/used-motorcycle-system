import type { NotificationProvider, NotificationTarget, ProviderResult } from '../types';

/**
 * LINE Messaging API provider (push messages via a LINE Official Account).
 *
 * All requests run server-side only. The channel access token is supplied at
 * construction time from the settings row and is NEVER exposed to the client.
 *
 * A single push endpoint handles user, group and room destinations — the `to`
 * field is just the destination id; `target.type` is informational.
 */
export class LineProvider implements NotificationProvider {
  readonly channel = 'line' as const;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  async send(target: NotificationTarget, text: string): Promise<ProviderResult> {
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          to: target.id,
          messages: [{ type: 'text', text }],
        }),
      });

      let response: unknown = null;
      try {
        response = await res.json();
      } catch {
        response = await res.text().catch(() => null);
      }

      if (!res.ok) {
        const msg =
          response && typeof response === 'object' && 'message' in response
            ? String((response as { message: unknown }).message)
            : `LINE API error ${res.status}`;
        return { ok: false, httpStatus: res.status, response, error: msg };
      }

      return { ok: true, httpStatus: res.status, response };
    } catch (e) {
      return {
        ok: false,
        httpStatus: null,
        response: null,
        error: e instanceof Error ? e.message : 'Network error contacting LINE',
      };
    }
  }
}
