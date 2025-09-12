
// Load environment variables from .env file at the very beginning
import { config } from 'dotenv';
config();

import type { NextConfig } from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

// `RemotePattern` typing may not be available in all Next versions in this path.
// Use a permissive `any` type for the remotePatterns to avoid build-time type issues.
// Build remotePatterns dynamically and include the Supabase host if available.
const remotePatterns: any[] = [
  {
    protocol: 'https',
    hostname: 'placehold.co',
    port: undefined,
    pathname: '/**',
  },
  // Explicit Supabase host used in this project so images render even if SUPABASE_URL
  // isn't available at build time. Replace with your project's host if different.
  {
    protocol: 'https',
    hostname: 'xjdelkjxcvrdmlkauxyp.supabase.co',
    pathname: '/**',
  },
];

// If a SUPABASE_URL is provided, add its hostname so Next/Image can load storage assets.
if (process.env.SUPABASE_URL) {
  try {
    const supaHost = new URL(process.env.SUPABASE_URL).hostname; // e.g. xyz.supabase.co
    remotePatterns.push({ protocol: 'https', hostname: supaHost, pathname: '/**' });
  } catch (e) {
    // ignore parse errors
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['@opentelemetry/sdk-node', '@opentelemetry/api', '@opentelemetry/core'],
  env: {
    OTEL_SDK_DISABLED: 'true',
    NEXT_OTEL_VERBOSE: '0',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: remotePatterns,
  },
   webpack: (config, { isServer, dev }) => {
    // Handle client-side fallbacks
    if (!isServer) {
        config.resolve.fallback = {
            ...config.resolve.fallback,
            fs: false,
            dns: false,
            net: false,
            tls: false,
        };
    }
    
    // Ignore handlebars warning
    config.module.rules.push({
      test: /node_modules\/handlebars\/lib\/index\.js$/,
      use: 'null-loader'
    });
    
    // Handle OpenTelemetry issues more comprehensively for all environments
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/api': false,
      '@opentelemetry/sdk-node': false,
      '@opentelemetry/core': false,
      '@opentelemetry/semantic-conventions': false,
      '@opentelemetry/resources': false,
      '@opentelemetry/auto-instrumentations-node': false,
    };
    
    // Exclude OpenTelemetry from bundling entirely
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        '@opentelemetry/api': 'commonjs @opentelemetry/api',
        '@opentelemetry/sdk-node': 'commonjs @opentelemetry/sdk-node',
      });
    }
    
    // Special handling for Edge Runtime (middleware)
    if (config.name === 'edge-runtime') {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@opentelemetry/api': false,
      };
    }
    
    return config;
  }
};

const withPWA = withPWAInit({
  dest: "public",
  disable: true, // Temporarily disabled to fix build issues
  register: false,
  reloadOnOnline: true,
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Strategy 1: Cache HTML pages (Network First)
      {
        urlPattern: ({ request, url }) => {
          if (request.destination !== "document") {
            return false;
          }
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
