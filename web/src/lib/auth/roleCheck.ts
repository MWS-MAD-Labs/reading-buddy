import { redirect } from "next/navigation";
import { getCurrentUser } from "./server";

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
    },
    role: userRole,
  };
}
