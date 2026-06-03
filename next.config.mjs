/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma needs to be treated as an external package in server components.
  serverExternalPackages: ["@prisma/client", "prisma"],
  eslint: {
    // Linting is run separately; do not block production builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
