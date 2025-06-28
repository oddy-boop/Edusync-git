
import type {NextConfig} from 'next';

// Attempt to get Supabase URL for image hostname config
// Note: process.env may not be fully available here depending on build context.
// It's generally safer to hardcode the pattern or use a wildcard.
const supabasePublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname = '';
if (supabasePublicUrl) {
  try {
    const url = new URL(supabasePublicUrl);
    supabaseHostname = url.hostname; // e.g., <project-ref>.supabase.co
  } catch (e) {
    console.warn('Could not parse NEXT_PUBLIC_SUPABASE_URL for image config:', e);
  }
}

const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'placehold.co',
    port: '',
    pathname: '/**',
  },
];

if (supabaseHostname) {
  remotePatterns.push({
    protocol: 'https',
    hostname: supabaseHostname,
    port: '',
    pathname: '/storage/v1/object/public/**', // Common path for Supabase public storage
  });
} else {
  // Fallback if NEXT_PUBLIC_SUPABASE_URL wasn't available or parsable at config time
  // This broad wildcard allows any Supabase project, adjust if more specific control is needed
  // and NEXT_PUBLIC_SUPABASE_URL cannot be reliably read here.
  remotePatterns.push({
    protocol: 'https',
    hostname: '*.supabase.co', // General Supabase hostname pattern
    port: '',
    pathname: '/storage/v1/object/public/**',
  });
   remotePatterns.push({ // Covers direct Supabase domain if not using a subdomain like <project-ref>
    protocol: 'https',
    hostname: 'supabase.co',
    port: '',
    pathname: '/storage/v1/object/public/**',
  });
}


const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: remotePatterns,
  },
  experimental: {
    // Removed allowedDevOrigins as it's not a recognized option
  },
};

export default nextConfig;

    