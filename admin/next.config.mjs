import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../'),
  // Cho phép gọi API Gateway tại cổng 3001
  async rewrites() {
    return [
      {
        source: '/api/gateway/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
