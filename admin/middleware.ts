import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveRouteAccess } from './lib/auth-edge';
import { DEFAULT_AUTH_CONFIG } from './lib/auth-types';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(DEFAULT_AUTH_CONFIG.sessionCookieName)?.value || null;

  const decision = resolveRouteAccess(pathname, token);

  if (decision.action === 'redirect' && decision.destination) {
    const url = request.nextUrl.clone();

    if (decision.destination.startsWith('/login?redirect=')) {
      url.pathname = '/login';
      const redirectParam = decodeURIComponent(decision.destination.split('=')[1] || '/');
      url.searchParams.set('redirect', redirectParam);
    } else {
      url.pathname = decision.destination;
      url.search = '';
    }

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
