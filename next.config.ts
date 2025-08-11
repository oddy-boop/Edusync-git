
import type { NextConfig } from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'placehold.co',
    port: '',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: '*.supabase.co',
    port: '',
    pathname: '/storage/v1/object/public/**',
  },
] as const;

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: remotePatterns,
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Strategy 1: Network First for HTML pages
      // Try network, if it fails, serve from cache. Best for pages.
      {
        urlPattern: ({ request, url }) => {
          if (request.destination !== "document") {
            return false;
          }
          // Ignore API routes
          if (url.pathname.startsWith('/api/')) {
            return false;
          }
          return true;
        },
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Strategy 2: Stale While Revalidate for JS/CSS
      // Serve from cache immediately, then update in the background. Good for assets that can be a bit old.
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-style-assets',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
          },
        },
      },
      // Strategy 3: Cache First for images
      // If it's in the cache, use it. Only go to network if it's not. Perfect for images.
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-image-assets',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
        },
      },
      // Strategy 4: Cache First for fonts
      {
        urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-font-assets',
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
        },
      },
    ],
  },
  fallbacks: {
    document: "/offline", // Fallback for document requests when offline
  },
});

export default withPWA(nextConfig);
