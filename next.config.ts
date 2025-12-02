import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/treino-gifs/:path*",
        destination:
          "https://961b6ef83806bc3c0cde2b72250b0a8f.r2.cloudflarestorage.com/treino-gifs/:path*",
      },
    ];
  },
};

export default nextConfig;
