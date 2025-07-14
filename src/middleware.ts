
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware function is a placeholder. It currently does nothing but pass
// the request through. It's here to prevent the "Cannot find the middleware module"
// error in Next.js when a middleware file is expected but missing.
// You can add logic here in the future to handle things like redirecting
// unauthenticated users, etc.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// This config specifies which paths the middleware should run on.
// By default, it runs on all paths except for API routes, Next.js
// internal paths, and static files like images.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
