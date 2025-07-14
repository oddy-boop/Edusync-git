import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This middleware is currently a passthrough.
  // It allows all requests to proceed without modification.
  // This is a safe default for local development and a single-school setup.
  // Future logic for multi-domain routing can be re-implemented here if needed.
  return NextResponse.next();
}

// This config ensures the middleware runs on all paths except for static
// assets and API routes, which is a standard and safe configuration.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
