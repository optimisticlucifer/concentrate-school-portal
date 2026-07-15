import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:4000';
const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ['@concentrate/shared'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` }];
  },
};

export default nextConfig;
