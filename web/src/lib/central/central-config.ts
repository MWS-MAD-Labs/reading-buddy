import { CentralDataClient } from "mws-central-auth/data-client";

// Central remains behind its HTTP API; Reading Buddy never connects to its database.

function value(name: string): string | null {
  return process.env[name]?.trim() || null;
}

export function centralRootUrl(): string | null {
  const configured = value("CENTRAL_API_BASE_URL");
  if (!configured) return null;
  return configured.replace(/\/+$/, "").replace(/\/api\/internal$/, "");
}

export function centralInternalBaseUrl(): string | null {
  const root = centralRootUrl();
  return root ? `${root}/api/internal` : null;
}

export function centralApiToken(): string | null {
  return value("CENTRAL_API_TOKEN");
}

export function centralOrganizationId(): string | null {
  return value("CENTRAL_ORGANIZATION_ID");
}

export function centralApplicationId(): string {
  return value("HUB_SSO_APP_ID") || "reading-buddy";
}

export function centralAuthHeaders(token: string): Record<string, string> {
  const organizationId = centralOrganizationId();
  return {
    authorization: `Bearer ${token}`,
    ...(organizationId
      ? { "x-central-organization-id": organizationId }
      : {}),
  };
}

export function centralDataClient(): CentralDataClient {
  const baseUrl = centralRootUrl();
  const token = centralApiToken();
  if (!baseUrl || !token) {
    throw new Error("Central API configuration is incomplete");
  }
  return new CentralDataClient({ baseUrl, token, timeoutMs: 10_000 });
}
