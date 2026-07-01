import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAppUser } from '@/lib/supabase/server';
import { queryNotificationHistory, customerName } from '@/lib/notifications/history';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const HEADERS = [
  'Date & Time', 'Contract Number', 'Customer Name', 'Stock Code', 'Brand',
  'Model', 'License Plate', 'Overdue Days', 'Destination', 'Status', 'Error Message',
];

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  // Escape for CSV; wrap in quotes and double any inner quotes.
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  // Developer-only export.
  const me = await getCurrentAppUser();
  if (!me || me.role !== 'developer') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const { rows } = await queryNotificationHistory({
    from: sp.get('from') || undefined,
    to: sp.get('to') || undefined,
    status: sp.get('status') || undefined,
    q: sp.get('q') || undefined,
    limit: 10000, // safety cap
    offset: 0,
  });

  const lines = [HEADERS.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push([
      new Date(r.sent_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' }),
      r.contract_number ?? '',
      customerName(r),
      r.stock_code ?? '',
      r.brand ?? '',
      r.model ?? '',
      r.license_plate ?? '',
      r.overdue_days ?? '',
      r.destination ?? '',
      r.status,
      r.error_message ?? '',
    ].map(csvCell).join(','));
  }

  // UTF-8 BOM so Excel renders Thai correctly.
  const body = '﻿' + lines.join('\r\n');
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="notification-history-${stamp}.csv"`,
    },
  });
}
