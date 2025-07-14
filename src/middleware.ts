
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /fonts (inside /public)
     * 4. /examples (inside /public)
     * 5. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|fonts|examples|[\\w-]+\\.\\w+).*)',
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || 'localhost:3000';

  // Exclude auth and portal pages from domain rewriting
  if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/portals') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/teacher') || url.pathname.startsWith('/student')) {
    return NextResponse.next();
  }

  // Use a regex to extract the domain part, ignoring standard ports for localhost
  const domain = hostname.replace(/:\d+$/, '').split('.')[0];
  
  // Prevent rewriting for Vercel preview URLs, localhost, and the root domain
  const isSpecialDomain = hostname.includes('vercel.app') || hostname.includes('localhost') || domain === 'www' || domain === '';
  
  if (!isSpecialDomain && url.pathname === '/') {
    // If on a subdomain like `sjm.yourapp.com` and at the root path,
    // rewrite to the dynamic marketing page for that school.
    return NextResponse.rewrite(new URL(`/${domain}`, req.url));
  }

  return NextResponse.next();
}
