/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sellfindconnect-media.fra1.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "sellfindconnect-media.fra1.cdn.digitaloceanspaces.com",
      },
    ],
  },
  transpilePackages: ["@telpen/domain"],
  experimental: {
    serverActions: { allowedOrigins: ["sellfindconnect.com", "www.sellfindconnect.com"] },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
