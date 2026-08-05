import { loadEnvConfig } from '@next/env';
import path from 'node:path';
import type { NextConfig } from 'next';

// The workspace commands run Next from apps/web, while local secrets live at the repository root.
// Only development/test processes load the root file; production receives runtime env from Coolify.
if (process.env.NODE_ENV !== 'production') {
  loadEnvConfig(path.resolve(__dirname, '../..'));
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  transpilePackages: ['@organizei/database', '@organizei/ui'],
};
export default nextConfig;
