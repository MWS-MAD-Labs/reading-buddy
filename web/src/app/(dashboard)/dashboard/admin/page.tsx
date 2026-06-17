import Link from "next/link";
import { AdminUserTable } from "@/components/dashboard/AdminUserTable";
import {
  Badge,
  buttonVariants,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { requireRole } from "@/lib/auth/roleCheck";
import { query } from "@/lib/db";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Only ADMIN users can access this page
  await requireRole(["ADMIN"]);

  // Get profiles with their emails from local database
  const result = await query(`
    SELECT
      p.id,
      p.full_name,
      p.role,
      p.access_level,
      u.email
    FROM profiles p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.updated_at DESC
  `);

  const users = result.rows.map((row: any) => ({
    id: row.id,
    full_name: row.full_name,
    role: row.role,
    access_level: row.access_level,
    email: row.email,
  }));

  console.log(`Fetched ${users.length} users from local database`);

  return (
    <div className="space-y-6">
      <Card variant="glow" padding="cozy">
        <CardHeader className="mb-5">
          <Badge variant="neutral" className="w-fit">
            Admin panel
          </Badge>
          <CardTitle className="text-3xl text-[#7E1518] md:text-4xl">
            User Management
          </CardTitle>
          <CardDescription className="max-w-2xl">
            Manage users, roles, access levels, badges, and login messages for
            the entire Reading Buddy system.
          </CardDescription>
        </CardHeader>
        <div className="mb-5 flex flex-wrap gap-2">
          <Badge variant="bubble">{users.length} users</Badge>
          <Badge variant="sky">
            {new Set(users.map((user) => user.role)).size} roles active
          </Badge>
          <Badge variant="lime">
            {users.filter((user) => user.role === "STUDENT").length} students
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/badges"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Manage Badges
          </Link>
          <Link
            href="/dashboard/admin/broadcasts"
            className={cn(buttonVariants({ variant: "neutral", size: "sm" }))}
          >
            Login Messages
          </Link>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            System Overview
          </Link>
        </div>
      </Card>

      <AdminUserTable users={users} />
    </div>
  );
}
