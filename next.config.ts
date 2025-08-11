
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
      // Strategy 0: Cache Supabase API calls (Network First)
      {
        urlPattern: /^https?.+\.supabase\.co\/rest\/v1\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api-cache',
          networkTimeoutSeconds: 10, // If network fails, fallback to cache quickly
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24, // 1 day
          },
          cacheableResponse: {
            statuses: [0, 200], // Cache opaque and successful responses
          },
        },
      },
      // Strategy 1: Cache HTML pages (Network First)
      {
        urlPattern: ({ request, url }) => {
          if (request.destination !== "document") {
            return false;
          }
          // Ignore API routes from caching
          if (url.pathname.startsWith('/api/')) {
            return false;
          }
          return true;
        },
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-cache',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      // Strategy 2: Cache JS/CSS (Stale While Revalidate)
      {
        urlPattern: /\.(?:js|css)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-assets-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
          },
        },
      },
      // Strategy 3: Cache Images (Cache First)
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
        },
      },
      // Strategy 4: Cache Fonts (Cache First)
      {
        urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'font-cache',
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
