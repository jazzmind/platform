import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@jazzmind/shared'],
  serverExternalPackages: ['better-auth'],
};

export default nextConfig;
