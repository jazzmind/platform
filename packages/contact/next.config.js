/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@sonnenreich/shared"],
  serverExternalPackages: ["@prisma/client"],
  // Using experimental flag to enable Next.js 15 features
  // experimental: {
  //   serverComponentsExternalPackages: ["@prisma/client"]
  // }
};

module.exports = nextConfig; 