import {
  centralApiToken,
  centralApplicationId,
  centralAuthHeaders,
  centralInternalBaseUrl,
  centralOrganizationId,
} from "@/lib/central/central-config";
import {
  APP_PERMISSIONS,
  ROLE_PERMISSIONS,
  centralRoleToUserRole,
  isAppPermission,
  type AppPermission,
  type CentralIdentitySource,
  type UserRole,
} from "@/lib/central/access-control";

export type CentralEntitlement = {
  id: string;
  person_id: string;
  application_id: string;
  organization_id: string;
  role: string;
  permissions: string[];
  version: number;
  is_active: boolean;
};

export type ResolvedCentralAccess = {
  entitlement: CentralEntitlement;
  role: UserRole;
  permissions: AppPermission[];
};

export class CentralUnavailableError extends Error {
  constructor(message = "Central could not be reached") {
    super(message);
    this.name = "CentralUnavailableError";
  }
}

function cacheDurationMs(): number {
  const seconds = Number(
    process.env.READING_BUDDY_CENTRAL_ACCESS_CACHE_SECONDS,
  );
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 30) * 1000;
}

const cache = new Map<
  string,
  { access: ResolvedCentralAccess; cachedAt: number }
>();

export function clearCentralAccessCache(): void {
  cache.clear();
}

export const clearCentralAccessCacheForTest = clearCentralAccessCache;

export function validateCentralEntitlement(
  personId: string,
  source: CentralIdentitySource,
  entitlement: CentralEntitlement,
): ResolvedCentralAccess {
  const applicationId = centralApplicationId();
  const organizationId = centralOrganizationId();

  if (
    !organizationId ||
    typeof entitlement.id !== "string" ||
    entitlement.id.length === 0 ||
    typeof entitlement.person_id !== "string" ||
    entitlement.person_id !== personId ||
    entitlement.application_id !== applicationId ||
    entitlement.organization_id !== organizationId ||
    entitlement.is_active !== true ||
    !Number.isInteger(entitlement.version) ||
    entitlement.version < 1 ||
    !Array.isArray(entitlement.permissions) ||
    entitlement.permissions.some(
      (permission) =>
        typeof permission !== "string" || !isAppPermission(permission),
    )
  ) {
    console.error("[central-auth] Central returned an invalid entitlement", {
      applicationId,
      knownPermissions: APP_PERMISSIONS,
    });
    throw new CentralUnavailableError(
      "Central entitlement is invalid for Reading Buddy",
    );
  }

  const role = centralRoleToUserRole(entitlement.role, source);
  const permissions = entitlement.permissions.filter(isAppPermission);
  if (
    !role ||
    !permissions.includes("dashboard.read") ||
    !ROLE_PERMISSIONS[role].every((permission) =>
      permissions.includes(permission),
    )
  ) {
    console.error("[central-auth] Central returned an unsupported access role", {
      applicationId,
      role: entitlement.role,
      source,
    });
    throw new CentralUnavailableError(
      "Central entitlement is invalid for Reading Buddy",
    );
  }

  return { entitlement, role, permissions };
}

export async function resolveCentralAccess(
  personId: string,
  source: CentralIdentitySource,
): Promise<ResolvedCentralAccess | null> {
  const cached = cache.get(personId);
  if (cached && Date.now() - cached.cachedAt < cacheDurationMs()) {
    return cached.access;
  }

  const baseUrl = centralInternalBaseUrl();
  const token = centralApiToken();
  const organizationId = centralOrganizationId();
  if (!baseUrl || !token || !organizationId) {
    throw new CentralUnavailableError("Central API configuration is incomplete");
  }

  const url = new URL(`${baseUrl}/application-entitlements/lookup`);
  url.searchParams.set("person_id", personId);
  url.searchParams.set("application_id", centralApplicationId());

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        ...centralAuthHeaders(token),
        accept: "application/json",
      },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error(
      "[central-auth] Entitlement lookup failed",
      error instanceof Error ? error.message : error,
    );
    throw new CentralUnavailableError();
  }

  const body = (await response.json().catch(() => null)) as
    | { data?: CentralEntitlement | null; code?: string }
    | null;
  if (
    response.status === 404 ||
    (response.status === 403 && body?.code === "application_retired")
  ) {
    cache.delete(personId);
    return null;
  }
  if (!response.ok || !body || !("data" in body)) {
    console.error(
      `[central-auth] Entitlement lookup returned HTTP ${response.status}`,
    );
    throw new CentralUnavailableError("Central entitlement lookup failed");
  }

  if (!body.data?.is_active) {
    cache.delete(personId);
    return null;
  }

  const access = validateCentralEntitlement(personId, source, body.data);
  cache.set(personId, { access, cachedAt: Date.now() });
  return access;
}
