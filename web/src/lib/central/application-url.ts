// Reverse proxies may expose an internal request host, so prefer the configured URL.
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export function applicationUrl(path: string, requestUrl: string): URL {
  const configuredBase =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = new URL(configuredBase || requestUrl);
  if (!HTTP_PROTOCOLS.has(base.protocol)) {
    throw new Error("The application URL must use HTTP or HTTPS");
  }
  return new URL(path, `${base.origin}/`);
}
