import { redirect } from "next/navigation";
import { getCurrentUser } from "./server";
import {
  ROLE_PERMISSIONS,
  hasPermission,
  type AppPermission,
} from "@/lib/central/access-control";

export type UserRole = "ADMIN" | "LIBRARIAN" | "TEACHER" | "STUDENT";

/**
 * Check if the current user has one of the required roles
 * Redirects to /dashboard with an error if unauthorized
 */
export type SessionUser = {
  id: string;
  email?: string;
  role?: UserRole;
  profileId?: string;
  permissions?: string[];
};

export type RequireRoleResult = {
  user: SessionUser;
  role: UserRole;
};

export async function requireRole(
  allowedRoles: UserRole[],
): Promise<RequireRoleResult> {
  // Get current user from NextAuth (redirects to login if not authenticated)
  const user = await getCurrentUser();

  // Get role from session
  const userRole = user.role as UserRole | undefined;

  if (!userRole || !allowedRoles.includes(userRole)) {
    // Redirect to dashboard with unauthorized message
    redirect("/dashboard?error=unauthorized");
  }

  return {
    user: {
      id: user.id!,
      email: user.email ?? undefined,
      role: userRole,
      profileId: user.profileId,
      permissions: user.permissions,
    },
    role: userRole,
  };
}

export async function requirePermission(
  permission: AppPermission,
): Promise<SessionUser> {
  const user = await getCurrentUser();
  const role = user.role as UserRole | undefined;
  const effectivePermissions =
    user.permissions ?? (role ? [...ROLE_PERMISSIONS[role]] : []);

  if (!hasPermission(effectivePermissions, permission)) {
    redirect("/dashboard?error=unauthorized");
  }

  return {
    id: user.id!,
    email: user.email ?? undefined,
    role,
    profileId: user.profileId,
    permissions: effectivePermissions,
  };
}
