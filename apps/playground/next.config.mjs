/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@acg/shared', '@acg/sdk'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000'}/:path*`,
      },
      {
        source: '/admin/:path*',
        destination: `${process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
