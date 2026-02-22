/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🛑 IGNORE TYPESCRIPT ERRORS
  typescript: {
    ignoreBuildErrors: true,
  },
  // 🛑 IGNORE ESLINT ERRORS
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow images from anywhere (fixes image upload issues too)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
