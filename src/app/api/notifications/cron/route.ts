import { NextRequest, NextResponse } from 'next/server';
import { shouldRunSchedulerNow, runOverdueNotifications } from '@/lib/notifications/service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Scheduler entry point. Called frequently (e.g. every few minutes) by
 * Supabase pg_cron via pg_net. Guarded by a shared secret so the public
 * internet cannot trigger it.
 *
 * The route is safe to call repeatedly: shouldRunSchedulerNow() enforces
 * "run once per day at/after the configured time" by atomically claiming the
 * day, and per-contract dedupe guarantees at most one notification per
 * contract per day even under concurrent calls.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const header = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  return header === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const gate = await shouldRunSchedulerNow();
  if (!gate.run) {
    return NextResponse.json({ ok: true, ran: false, reason: gate.reason });
  }

  const summary = await runOverdueNotifications('scheduler');
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
