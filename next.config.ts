
import type {NextConfig} from 'next';

const remotePatterns = [
  {
    protocol: 'https',
    hostname: 'placehold.co',
    port: '',
    pathname: '/**',
  },
  // Correct, robust pattern for Supabase storage
  {
    protocol: 'https',
    hostname: '*.supabase.co',
    port: '',
    pathname: '/storage/v1/object/public/**',
  },
];

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

export default nextConfig;
