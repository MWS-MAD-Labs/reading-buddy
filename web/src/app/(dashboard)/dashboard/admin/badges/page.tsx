import Link from "next/link";
import {
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { requireRole } from "@/lib/auth/roleCheck";
import { cn } from "@/lib/cn";
import { getAllBadges, getBooksForBadgeAssignment } from "../badge-actions";
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
      <Card variant="glow" padding="cozy">
        <CardHeader className="mb-5">
          <Badge variant="neutral" className="w-fit">
            {isAdmin ? "Admin panel" : "Librarian tools"}
          </Badge>
          <CardTitle className="text-3xl text-[#7E1518] md:text-4xl">
            Badge Management
          </CardTitle>
          <CardDescription className="max-w-3xl">
            {headerDescription}
          </CardDescription>
        </CardHeader>
        <Link
          href={isAdmin ? "/dashboard/admin" : "/dashboard/librarian"}
          className={cn(buttonVariants({ variant: "neutral", size: "sm" }))}
        >
          Back to {isAdmin ? "admin" : "librarian"} home
        </Link>
      </Card>

      <Card variant="frosted" padding="cozy">
        <BadgeManager
          initialBadges={badges}
          books={books}
          permissions={permissions}
        />
      </Card>
    </div>
  );
}
