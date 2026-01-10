import type { NextConfig } from "next";

const minioHost =
  process.env.MINIO_ENDPOINT && process.env.MINIO_ENDPOINT.trim() !== ""
    ? process.env.MINIO_ENDPOINT.trim()
    : "storage.yourschool.com";
const minioProtocol = process.env.MINIO_USE_SSL === "false" ? "http" : "https";
const minioPort =
  process.env.MINIO_PORT && process.env.MINIO_PORT !== ""
    ? process.env.MINIO_PORT
    : undefined;

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone", // Required for Docker deployment
  images: {
    remotePatterns: [
      {
        protocol: minioProtocol as "http" | "https",
        hostname: minioHost,
        port: minioPort,
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "minioapi.mws.web.id",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
