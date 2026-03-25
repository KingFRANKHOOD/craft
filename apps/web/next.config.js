/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@craft/types', '@craft/stellar', '@craft/ui'],
};

module.exports = nextConfig;
