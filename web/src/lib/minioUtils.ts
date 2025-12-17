import { getMinioBucketName } from '@/lib/minio';

const resolvePublicEndpoint = () => {
  const endpoint = process.env.MINIO_ENDPOINT;
  if (!endpoint) {
    throw new Error('MINIO_ENDPOINT is not configured.');
  }
  const useSSL = process.env.MINIO_USE_SSL !== 'false';
  const port = process.env.MINIO_PORT;
  const protocol = useSSL ? 'https' : 'http';
  const defaultPort = useSSL ? '443' : '80';
  const portSegment = port && port !== defaultPort ? `:${port}` : '';
  return `${protocol}://${endpoint}${portSegment}`;
};

export const getPublicBaseUrl = () => resolvePublicEndpoint();

export const buildPublicObjectUrl = (objectKey: string) => {
  const bucketName = getMinioBucketName();
  const baseUrl = getPublicBaseUrl();
  const normalizedKey = objectKey.replace(/^\/+/g, '');
  return `${baseUrl}/${bucketName}/${normalizedKey}`;
};

export const buildPublicPrefixUrl = (prefix: string) => buildPublicObjectUrl(prefix.replace(/\/$/, ''));

const decodeSegment = (segment: string) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

export const getObjectKeyFromPublicUrl = (publicUrl: string | null | undefined) => {
  if (!publicUrl) {
    return null;
  }
  const bucketName = getMinioBucketName();
  const baseUrl = getPublicBaseUrl();
  const trimmed = publicUrl.trim();
  if (!trimmed) {
    return null;
  }
  const prefix = `${baseUrl.replace(/\/$/, '')}/${bucketName}/`;
  if (trimmed.startsWith(prefix)) {
    return trimmed.slice(prefix.length);
  }
  try {
    const parsed = new URL(trimmed);
    const pathParts = parsed.pathname
      .split('/')
      .filter(Boolean)
      .map((segment: any) => decodeSegment(segment));
    if (!pathParts.length) {
      return null;
    }
    if (pathParts[0] === bucketName) {
      return pathParts.slice(1).join('/');
    }
    return pathParts.join('/');
  } catch {
    return null;
  }
};

export const buildBookAssetsPrefix = (bookId: number) => `book-pages/${bookId}`;

export const buildPageImageKey = (bookId: number, pageNumber: number) => {
  const prefix = buildBookAssetsPrefix(bookId);
  const suffix = String(pageNumber).padStart(4, '0');
  return `${prefix}/page-${suffix}.jpg`;
};
