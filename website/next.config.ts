import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Needed for accessing parent directory files (presentations)
  serverRuntimeConfig: {
    projectRoot: process.cwd(),
  },
};

export default nextConfig;
