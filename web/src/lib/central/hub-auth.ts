import type { Session } from "next-auth";
import { headers } from "next/headers";
import { hubSession } from "@/lib/central/hub-session";
import { resolveCentralAccess } from "@/lib/central/central-access";
import { projectCentralUser } from "@/lib/central/central-user-projection";

export async function resolveHubSession(
  cookieHeader?: string | null,
): Promise<Session | null> {
  const cookie =
    cookieHeader === undefined
      ? (await headers()).get("cookie")
      : cookieHeader;
  const identity = await hubSession().fromCookieHeader(cookie);
  if (!identity) return null;

  const access = await resolveCentralAccess(identity.sub, identity.source);
  if (!access) return null;

  const local = await projectCentralUser(
    identity,
    access.entitlement,
    access.role,
    access.permissions,
  );

  return {
    user: {
      id: local.id,
      userId: local.id,
      profileId: local.profileId,
      email: local.email,
      name: local.fullName,
      fullName: local.fullName,
      role: local.role,
      grade: local.grade ?? undefined,
      accessLevel: local.accessLevel,
      xp: local.xp,
      level: local.level,
      centralPersonId: identity.sub,
      centralSource: identity.source,
      centralRole: access.entitlement.role,
      permissions: access.permissions,
      entitlementVersion: access.entitlement.version,
    },
    expires: new Date(identity.exp * 1000).toISOString(),
  };
}
