import Link from "next/link";
import { requireRole } from "@/lib/auth/roleCheck";
import {
  getAllBadges,
  getBooksForBadgeAssignment,
} from "../badge-actions";
import {
  BadgeManager,
  type UserPermissions,
} from "@/components/dashboard/BadgeManager";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  // Authenticate and check role using NextAuth
  const { user, role } = await requireRole(["ADMIN", "LIBRARIAN"]);

  // Build permissions object based on role
  const isAdmin = role === "ADMIN";
  const isLibrarian = role === "LIBRARIAN";

  const permissions: UserPermissions = {
    role: role as "ADMIN" | "LIBRARIAN",
    userId: user.id,
    canCreateAllBadges: isAdmin,
    canEditSystemBadges: isAdmin,
    canOnlyCreateBookBadges: isLibrarian,
  };

  // Fetch all badges and books using server actions
  const [badges, books] = await Promise.all([
    getAllBadges(),
    getBooksForBadgeAssignment(),
  ]);

  // Debug: Log badges count
  console.log(`[Badge Management] Fetched ${badges.length} badges`);

  // Header text based on role
  const headerDescription = isAdmin
    ? "Create and manage all badges for students. You can create general badges or book-specific completion badges."
    : "Create book-specific completion badges. Select a book to create a badge that students earn when they finish reading it.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-[32px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(147,118,255,0.25)]">
        <div className="flex items-center gap-2 text-sm text-indigo-400">
          <Link
            href={isAdmin ? "/dashboard/admin" : "/dashboard/librarian"}
            className="hover:text-indigo-600"
          >
            {isAdmin ? "Admin" : "Librarian"} Dashboard
          </Link>
          <span>/</span>
          <span className="text-indigo-600">Badge Management</span>
        </div>
        <h1 className="mt-2 text-3xl font-black">Badge Management</h1>
        <p className="text-sm text-indigo-500">{headerDescription}</p>
      </header>

      {/* Badge Manager Component */}
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(147,118,255,0.18)]">
        <BadgeManager
          initialBadges={badges}
          books={books}
          permissions={permissions}
        />
      </div>
    </div>
  );
}
