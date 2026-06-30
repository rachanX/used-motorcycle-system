import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/i18n/request';
import { updateSession } from '@/lib/supabase/middleware';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

// Pages that don't require login
const PUBLIC_PATHS = ['/login'];

// Pages that require role = 'developer' (checked again by RLS server-side,
// this is just so staff never even see the page render)
const DEVELOPER_ONLY_PATHS = ['/users', '/audit-logs', '/settings'];

export async function middleware(request: NextRequest) {
  // 1. Let next-intl resolve/redirect the locale prefix first.
  const intlResponse = intlMiddleware(request);

  // 2. Refresh the Supabase session against the (possibly intl-redirected) request.
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const pathWithoutLocale = '/' + pathname.split('/').slice(2).join('/');
  const isPublic = PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p));
  const locale = pathname.split('/')[1] || defaultLocale;

  if (!user && !isPublic) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathWithoutLocale.startsWith('/login')) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  const isDeveloperOnly = DEVELOPER_ONLY_PATHS.some((p) => pathWithoutLocale.startsWith(p));
  if (user && isDeveloperOnly) {
    // Lightweight role check via a custom claim set on the JWT (see
    // Phase 2 README: auth hook / users table lookup). Fallback: allow
    // through and let the server component's own check + RLS block it.
    const role = user.app_metadata?.role ?? user.user_metadata?.role;
    if (role && role !== 'developer') {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }
  }

  // Merge intl's response headers (locale cookie etc.) onto the auth response.
  intlResponse.headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
