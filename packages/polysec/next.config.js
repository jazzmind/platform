/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip linting and type checking during builds for rapid deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Package-specific configuration
  transpilePackages: ['@jazzmind/knowledgebase'], // Add any packages that need transpilation
  
  // Enable standalone mode for development
  // output: process.env.NODE_ENV === 'production' ? 'export' : undefined, // Disabled for package builds
  
  // Configure webpack to handle pdfjs-dist legacy build
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Configure externals for server-side rendering
      config.externals = config.externals || [];
      config.externals.push({
        // Treat canvas as external to avoid server-side issues
        canvas: 'commonjs canvas',
      });
      
      // Handle pdfjs-dist legacy build imports
      config.resolve = config.resolve || {};
      config.resolve.alias = config.resolve.alias || {};
      
      // Don't try to bundle the legacy build - let it be dynamically imported
      config.externals.push(function ({ request }, callback) {
        if (request === 'pdfjs-dist/legacy/build/pdf.mjs') {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }
    
    return config;
  },
};

module.exports = nextConfig;
