import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

/**
 * Next.js configuration file.
 *
 * reactStrictMode: catches common React mistakes during development
 * by running components twice to detect side effects.
 *
 * Environment variables: Next.js reads .env files from the project
 * root (web/). We create a .env.local in web/ that references the
 * monorepo root .env values for NEXT_PUBLIC_* variables.
 */
const backendInternal =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  /**
   * When the browser uses a relative API base (`/api/v1`), Next forwards those
   * requests to the Nest server. That avoids broken sign-up from phones or
   * other machines using the dev "Network" URL, where `localhost:3001` would
   * point at the wrong host.
   */
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendInternal}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default analyzer(nextConfig);
