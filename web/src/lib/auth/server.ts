import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

/**
 * Get the current user session on the server
 * Use this in Server Components and Server Actions
 */
export async function getSession() {
  return await auth();
}

/**
 * Require authentication - redirect to login if not authenticated
 * Use this in protected pages
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

/**
 * Get current user or redirect to login
 */
export async function getCurrentUser() {
  const session = await requireAuth();
  return session.user;
}
