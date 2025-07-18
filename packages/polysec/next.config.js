/** @type {import('next').NextConfig} */
const nextConfig = {
  // Package-specific configuration
  transpilePackages: [], // Add any packages that need transpilation
  
  // Enable standalone mode for development
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
};

module.exports = nextConfig;
