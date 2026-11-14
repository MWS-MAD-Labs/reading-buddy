import { createHubSession } from "mws-central-auth/server";

// Shared-session mode is available because Hub and Reading Buddy share a parent domain.

export function isHubAuthEnabled(): boolean {
  return (
    process.env.READING_BUDDY_AUTH_MODE?.trim().toLowerCase() === "hub"
  );
}

export function hubSession() {
  const hubBaseUrl = process.env.HUB_BASE_URL?.trim();
  if (!hubBaseUrl) throw new Error("HUB_BASE_URL is not configured");
  return createHubSession({
    hubBaseUrl,
    audience: process.env.HUB_ACCESS_AUDIENCE?.trim() || "mws-apps",
    cookieName: process.env.HUB_ACCESS_COOKIE_NAME?.trim() || undefined,
  });
}
