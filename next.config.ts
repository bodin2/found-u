import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qfqptklywqbvpjjbmswy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/login", destination: "/auth/login", permanent: true },
      { source: "/login/register", destination: "/auth/register", permanent: true },
      { source: "/login/forgot-pin", destination: "/auth/login/forgot-pin", permanent: true },
      { source: "/login/reset-password", destination: "/auth/login/reset-password", permanent: true },
      { source: "/login/change-password", destination: "/auth/change-password", permanent: true },
      { source: "/login/setup-pin", destination: "/auth/setup-pin", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
