import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TEMPORARY diagnostic. Returns masked info about the Supabase env vars
// that the DEPLOYED app actually sees. Delete this route once login works.
function describe(v: string | undefined) {
  if (v === undefined) return { present: false };
  return {
    present: true,
    length: v.length,
    head: v.slice(0, 30),
    tail: v.slice(-6),
    hasWhitespace: /\s/.test(v),
    endsWithSupabaseCo: v.endsWith('.supabase.co')
  };
}

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: describe(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: describe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: describe(process.env.SUPABASE_SERVICE_ROLE_KEY),
    NEXT_PUBLIC_SITE_URL: describe(process.env.NEXT_PUBLIC_SITE_URL)
  });
}
