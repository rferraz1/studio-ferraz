import type { NextConfig } from "next";

const gifsBasePath = process.env.NEXT_PUBLIC_GIFS_BASE_URL;
const r2PublicBase =
  process.env.R2_PUBLIC_BASE_URL ||
  "https://pub-af59eb9bd0e644afb68c5c25d93f8272.r2.dev/gifs";

const nextConfig: NextConfig = {
  async rewrites() {
    if (!gifsBasePath || gifsBasePath.startsWith("http")) {
      return [];
    }

    const source = `${gifsBasePath.replace(/\/$/, "")}/:path*`;
    const destination = `${r2PublicBase.replace(/\/$/, "")}/:path*`;

    return [{ source, destination }];
  },
};

export default nextConfig;
