/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode is true by default in Next.js 15
  // output: 'standalone', // Consider this for deployments if needed
  transpilePackages: ["@sonnenreich/shared"], // If it uses shared components
  serverExternalPackages: ["@prisma/client"], // For Prisma
};

module.exports = nextConfig; 