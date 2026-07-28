/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ai-calling-agent/types', '@ai-calling-agent/utils'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
  images: {
    domains: ['localhost'],
  },
  experimental: {
    // Disable problematic dev overlay features that cause module resolution errors
    serverComponentsExternalPackages: [],
  },
  // Suppress known dev-only warnings about React Server Components bundler
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
