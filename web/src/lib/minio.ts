import { Client as MinioClient } from "minio";

type MinioConfig = {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucketName: string;
};

let client: MinioClient | null = null;
let publicClient: MinioClient | null = null;

const getEndpointEnv = (scope: "internal" | "public") => {
  if (scope === "internal") {
    return {
      endPoint:
        process.env.MINIO_INTERNAL_ENDPOINT || process.env.MINIO_ENDPOINT,
      port: process.env.MINIO_INTERNAL_PORT || process.env.MINIO_PORT,
      useSSL: process.env.MINIO_INTERNAL_USE_SSL ?? process.env.MINIO_USE_SSL,
    };
  }

  return {
    endPoint: process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT,
    port: process.env.MINIO_PUBLIC_PORT || process.env.MINIO_PORT,
    useSSL: process.env.MINIO_PUBLIC_USE_SSL ?? process.env.MINIO_USE_SSL,
  };
};

const getConfig = (scope: "internal" | "public" = "internal"): MinioConfig => {
  const endpointEnv = getEndpointEnv(scope);
  const endPoint = endpointEnv.endPoint;
  const port = Number(endpointEnv.port ?? 443);
  const useSSL = endpointEnv.useSSL !== "false";
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucketName = process.env.MINIO_BUCKET_NAME;

  if (!endPoint || !accessKey || !secretKey || !bucketName) {
    throw new Error("MinIO environment variables are missing.");
  }

  return {
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    bucketName,
  };
};

export const getMinioClient = () => {
  if (client) {
    return client;
  }

  const { bucketName, ...clientConfig } = getConfig("internal");
  void bucketName;
  client = new MinioClient(clientConfig);
  return client;
};

export const getMinioPublicClient = () => {
  if (publicClient) {
    return publicClient;
  }

  const { bucketName, ...clientConfig } = getConfig("public");
  void bucketName;
  publicClient = new MinioClient(clientConfig);
  return publicClient;
};

export const getMinioBucketName = () => getConfig().bucketName;

export const getMinioPublicConfig = () => {
  const endpointEnv = getEndpointEnv("public");
  const endPoint = endpointEnv.endPoint;
  const useSSL = endpointEnv.useSSL !== "false";
  const port = Number(endpointEnv.port ?? (useSSL ? 443 : 80));

  if (!endPoint) {
    throw new Error("MinIO public endpoint is not configured.");
  }

  return {
    endPoint,
    port,
    useSSL,
    bucketName: getMinioBucketName(),
  };
};
