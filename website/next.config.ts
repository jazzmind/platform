import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Needed for accessing parent directory files (presentations)
  serverRuntimeConfig: {
    projectRoot: process.cwd(),
  },
  
  // Add transpilePackages for the shared and feature packages
  transpilePackages: [
    "@sonnenreich/shared",
    "@sonnenreich/presentation-feature"
  ],
};

export default nextConfig;
