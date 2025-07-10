
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

const APP_ROUTES = ['/admin', '/student', '/teacher', '/auth', '/portals'];

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host');
  const path = url.pathname;

  // Prevent rewriting for internal app routes like /admin, /student, etc.
  if (APP_ROUTES.some(route => path.startsWith(route))) {
    return NextResponse.next();
  }

  // Prevent rewriting for Vercel deploy previews
  if (hostname?.includes('vercel.app')) {
    return NextResponse.next();
  }

  // Get the main site URL from environment variables
  const mainSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!mainSiteUrl) {
    console.error("Middleware Error: NEXT_PUBLIC_SITE_URL is not set.");
    return NextResponse.next();
  }
  
  const mainDomain = new URL(mainSiteUrl).hostname;

  // If the request is for the main domain, do nothing.
  if (hostname === mainDomain) {
    return NextResponse.next();
  }

  // For custom domains, rewrite the path to include the domain as a parameter
  // e.g., a request to `portal.sjm.com/about` will be rewritten to `/portal.sjm.com/about`
  // The `[domain]` folder in `/app` will then handle this route.
  return NextResponse.rewrite(
    new URL(`/${hostname}${path}`, req.url)
  );
}
