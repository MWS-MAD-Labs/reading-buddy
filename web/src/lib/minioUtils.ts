import { getMinioBucketName, getMinioPublicConfig } from "@/lib/minio";

const buildBaseUrl = (endpoint: string, useSSL: boolean, port: number) => {
  const protocol = useSSL ? "https" : "http";
  const defaultPort = useSSL ? 443 : 80;
  const portSegment = port !== defaultPort ? `:${port}` : "";
  return `${protocol}://${endpoint}${portSegment}`;
};

const resolvePublicEndpoint = () => {
  const config = getMinioPublicConfig();
  return buildBaseUrl(config.endPoint, config.useSSL, config.port);
};

const resolveInternalEndpoint = () => {
  const endpoint =
    process.env.MINIO_INTERNAL_ENDPOINT || process.env.MINIO_ENDPOINT;
  if (!endpoint) {
    return null;
  }

  const useSSL =
    (process.env.MINIO_INTERNAL_USE_SSL ?? process.env.MINIO_USE_SSL) !==
    "false";
  const port = Number(
    process.env.MINIO_INTERNAL_PORT ??
      process.env.MINIO_PORT ??
      (useSSL ? 443 : 80),
  );

  return buildBaseUrl(endpoint, useSSL, port);
};

export const getPublicBaseUrl = () => resolvePublicEndpoint();

export const buildPublicObjectUrl = (objectKey: string) => {
  const bucketName = getMinioBucketName();
  const baseUrl = getPublicBaseUrl();
  const normalizedKey = objectKey.replace(/^\/+/g, "");
  return `${baseUrl}/${bucketName}/${normalizedKey}`;
};

export const buildPublicPrefixUrl = (prefix: string) =>
  buildPublicObjectUrl(prefix.replace(/\/$/, ""));

const decodeSegment = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const getObjectKeyFromPublicUrl = (
  publicUrl: string | null | undefined,
) => {
  if (!publicUrl) {
    return null;
  }

  let bucketName: string | null = null;
  try {
    bucketName = getMinioBucketName();
  } catch {
    bucketName = null;
  }

  const trimmed = publicUrl.trim();
  if (!trimmed) {
    return null;
  }

  const candidateBaseUrls = [];
  try {
    candidateBaseUrls.push(getPublicBaseUrl());
  } catch {
    // Public MinIO config is optional for parsing stored absolute URLs.
  }

  const internalEndpoint = resolveInternalEndpoint();
  if (internalEndpoint) {
    candidateBaseUrls.push(internalEndpoint);
  }

  const uniqueBaseUrls = candidateBaseUrls.filter(
    (value, index, all): value is string =>
      Boolean(value) && all.indexOf(value) === index,
  );

  if (bucketName) {
    for (const baseUrl of uniqueBaseUrls) {
      const prefix = `${baseUrl.replace(/\/$/, "")}/${bucketName}/`;
      if (trimmed.startsWith(prefix)) {
        return trimmed.slice(prefix.length);
      }
    }
  }

  try {
    const parsed = new URL(trimmed);
    const pathParts = parsed.pathname
      .split("/")
      .filter(Boolean)
      .map((segment: string) => decodeSegment(segment));
    if (!pathParts.length) {
      return null;
    }
    if (bucketName && pathParts[0] === bucketName) {
      return pathParts.slice(1).join("/");
    }
    return pathParts.join("/");
  } catch {
    return null;
  }
};

export const buildBookAssetsPrefix = (bookId: number) => `book-pages/${bookId}`;

export const buildPageImageKey = (bookId: number, pageNumber: number) => {
  const prefix = buildBookAssetsPrefix(bookId);
  const suffix = String(pageNumber).padStart(4, "0");
  return `${prefix}/page-${suffix}.jpg`;
};

/**
 * Normalize a stored MinIO URL to use the current endpoint configuration.
 * This handles cases where URLs were stored with a different endpoint (e.g., minioapi.mws.web.id)
 * but we now need to access them via a different endpoint (e.g., direct IP).
 */
export const normalizeMinioUrl = (
  storedUrl: string | null | undefined,
): string | null => {
  if (!storedUrl) {
    return null;
  }

  const objectKey = getObjectKeyFromPublicUrl(storedUrl);
  if (!objectKey) {
    // If we can't extract the object key, return the original URL
    return storedUrl;
  }

  // Rebuild the URL using the current endpoint configuration
  return buildPublicObjectUrl(objectKey);
};
