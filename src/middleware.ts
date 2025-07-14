import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If the user requests the root path, rewrite it to show the /portals page content.
  // This avoids a redirect and directly serves the correct entry point.
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/portals', request.url));
  }

  // Allow all other requests to proceed as normal.
  return NextResponse.next();
}

// This config ensures the middleware runs on all paths except for static
// assets and API routes, which is a standard and safe configuration.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};