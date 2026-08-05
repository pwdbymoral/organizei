import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  transpilePackages: ['@organizei/database', '@organizei/ui'],
};
export default nextConfig;
