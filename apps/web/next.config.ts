import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@jamicore/ui', '@jamicore/auth', '@jamicore/db'],
}

export default nextConfig
