import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/admin', '/teacher', '/student'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  // Accept the refresh token too: the short-lived access cookie expires well
  // before the session does, and the client refreshes it on the first 401.
  const hasSession =
    request.cookies.has('access_token') || request.cookies.has('refresh_token');

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*'],
};
