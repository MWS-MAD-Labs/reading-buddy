import Link from "next/link";
import { AdminUserTable } from "@/components/dashboard/AdminUserTable";
import { requireRole } from "@/lib/auth/roleCheck";
import { query } from "@/lib/db";

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
      <header className="rounded-3xl border border-[#1F2A44]/15 bg-gradient-to-br from-white to-[#E9EDF6] p-6 soft-shadow">
        <div className="heading-font mb-3 inline-flex rounded-full bg-[#E9EDF6] px-4 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#1F2A44]">
          Admin panel
        </div>
        <h1 className="heading-font text-3xl font-extrabold text-[#7E1518]">
          User Management
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[#5d4b4c]">
          Manage users, roles, and access levels for the entire system.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/dashboard/admin/badges"
            className="heading-font inline-flex items-center gap-2 rounded-full bg-[#D6A13A] px-4 py-2 text-sm font-bold text-[#241718] transition hover:bg-[#c28e28]"
          >
            Manage Badges
          </Link>
          <Link
            href="/dashboard/admin/broadcasts"
            className="heading-font inline-flex items-center gap-2 rounded-full border border-[#1F2A44]/15 bg-white px-4 py-2 text-sm font-bold text-[#1F2A44] transition hover:bg-[#E9EDF6]"
          >
            Login Messages
          </Link>
          <Link
            href="/dashboard"
            className="heading-font inline-flex items-center gap-2 rounded-full border border-[#7E1518]/20 bg-white px-4 py-2 text-sm font-bold text-[#7E1518] transition hover:bg-[#F5E7E8]"
          >
            📊 System Overview
          </Link>
        </div>
      </header>

      <AdminUserTable users={users} />
    </div>
  );
}
