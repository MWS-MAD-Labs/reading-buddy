import type { NextConfig } from "next";

const minioHost =
  process.env.MINIO_PUBLIC_ENDPOINT && process.env.MINIO_PUBLIC_ENDPOINT.trim() !== ""
    ? process.env.MINIO_PUBLIC_ENDPOINT.trim()
    : process.env.MINIO_ENDPOINT && process.env.MINIO_ENDPOINT.trim() !== ""
      ? process.env.MINIO_ENDPOINT.trim()
    : "storage.yourschool.com";
const minioProtocol =
  (process.env.MINIO_PUBLIC_USE_SSL ?? process.env.MINIO_USE_SSL) === "false"
    ? "http"
    : "https";
const minioPort =
  process.env.MINIO_PUBLIC_PORT && process.env.MINIO_PUBLIC_PORT !== ""
    ? process.env.MINIO_PUBLIC_PORT
    : process.env.MINIO_PORT && process.env.MINIO_PORT !== ""
      ? process.env.MINIO_PORT
    : undefined;

const internalMinioHost =
  process.env.MINIO_INTERNAL_ENDPOINT &&
  process.env.MINIO_INTERNAL_ENDPOINT.trim() !== ""
    ? process.env.MINIO_INTERNAL_ENDPOINT.trim()
    : undefined;
const internalMinioProtocol =
  (process.env.MINIO_INTERNAL_USE_SSL ?? process.env.MINIO_USE_SSL) === "false"
    ? "http"
    : "https";
const internalMinioPort =
  process.env.MINIO_INTERNAL_PORT && process.env.MINIO_INTERNAL_PORT !== ""
    ? process.env.MINIO_INTERNAL_PORT
    : process.env.MINIO_PORT && process.env.MINIO_PORT !== ""
      ? process.env.MINIO_PORT
      : undefined;

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone", // Required for Docker deployment
  images: {
    unoptimized: true, // Disable Next.js Image Optimization (needed for self-hosted MinIO with private IP)
    remotePatterns: [
      {
        protocol: minioProtocol as "http" | "https",
        hostname: minioHost,
        port: minioPort,
        pathname: "/**",
      },
      ...(internalMinioHost
        ? [
            {
              protocol: internalMinioProtocol as "http" | "https",
              hostname: internalMinioHost,
              port: internalMinioPort,
              pathname: "/**",
            },
          ]
        : []),
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
