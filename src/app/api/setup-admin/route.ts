import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data, error } = await admin.auth.admin.updateUserById(
    'c8d56e9f-d5f0-4424-a82a-b3ab9310338e',
    { password: 'adminrachan' }
  );

  if (error) return NextResponse.json({ error: error.message, url: url.slice(0, 30) }, { status: 500 });
  return NextResponse.json({ ok: true, email: data.user?.email });
}
