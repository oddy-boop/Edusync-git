
import type {NextConfig} from 'next';

const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'placehold.co',
    port: '',
    pathname: '/**',
  },
  // Use a wildcard pattern for Supabase to ensure reliability.
  // This is safer than relying on process.env at build time.
  {
    protocol: 'https',
    hostname: '*.supabase.co',
    port: '',
    pathname: '/storage/v1/object/public/**',
  },
];


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
