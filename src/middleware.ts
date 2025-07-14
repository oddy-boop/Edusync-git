
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

  // Exclude auth, portal, and dashboard pages from any domain rewriting logic.
  if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/portals') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/teacher') || url.pathname.startsWith('/student')) {
    return NextResponse.next();
  }
  
  // Clean up hostname for reliable parsing
  const cleanHostname = hostname.toLowerCase().replace(/:\d+$/, ''); // remove port

  // Handle special development and preview domains
  if (cleanHostname.endsWith('localhost') || cleanHostname.endsWith('.vercel.app') || cleanHostname === '127.0.0.1') {
    return NextResponse.next(); // Do not rewrite for these domains
  }
  
  // Extract subdomain for custom domains
  const domainParts = cleanHostname.split('.');
  // This logic assumes a structure like `subdomain.domain.tld` or `subdomain.localhost`
  // For a custom domain like `sjm.schoolsite.com`, it will correctly extract `sjm`
  // It handles cases with more than 2 parts (e.g. co.uk) by taking the first part.
  const domain = domainParts[0];

  // If a valid subdomain is found and we are at the root path, rewrite to the dynamic marketing page.
  if (domain && domain !== 'www' && url.pathname === '/') {
    return NextResponse.rewrite(new URL(`/${domain}`, req.url));
  }

  return NextResponse.next();
}
