import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@organizei/database', '@organizei/ui'],
};
export default nextConfig;
