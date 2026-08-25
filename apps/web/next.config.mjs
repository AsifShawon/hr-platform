import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@hr/config',
    '@hr/domain',
    '@hr/schemas',
    '@hr/card-kit',
    '@hr/i18n',
    '@hr/ui',
    '@hr/fixtures',
  ],
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    return [
      {
        source: '/api/:path((?!health$).*)',
        destination: `${apiUrl}/api/:path`,
      },
    ];
  },
};

export default nextConfig;
