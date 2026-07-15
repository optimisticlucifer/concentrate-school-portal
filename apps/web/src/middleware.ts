import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/admin', '/teacher', '/student'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasToken = request.cookies.has('access_token');

  if (PROTECTED.some((p) => pathname.startsWith(p)) && !hasToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*'],
};
