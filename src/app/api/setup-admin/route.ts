import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const userId = 'c8d56e9f-d5f0-4424-a82a-b3ab9310338e';

  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: 'adminrachan' })
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data }, { status: 500 });
  return NextResponse.json({ ok: true, email: data.email });
}
