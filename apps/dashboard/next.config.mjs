/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.ADMIN_URL ?? 'http://localhost:3002',
    NEXT_PUBLIC_GATEWAY_URL: process.env.GATEWAY_URL ?? 'http://localhost:3000',
  },
};

export default nextConfig;
