import Link from "next/link";
import { AdminUserTable } from "@/components/dashboard/AdminUserTable";
import { requireRole } from "@/lib/auth/roleCheck";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Only ADMIN users can access this page
  await requireRole(["ADMIN"]);

  const supabaseAdmin = getSupabaseAdminClient();

  // Get profiles with their auth emails
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role, access_level")
    .order("updated_at", {
      ascending: false,
    });

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }

  // Get emails one-by-one to avoid listUsers Auth API failures
  const emailCache = new Map<string, string | null>();
  const usersWithEmails = await Promise.all(
    (profiles || []).map(async (profile) => {
      if (emailCache.has(profile.id)) {
        return { ...profile, email: emailCache.get(profile.id) ?? null };
      }

      try {
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.getUserById(profile.id);

        if (userError) {
          console.warn(
            `Unable to fetch auth user ${profile.id}:`,
            userError.message || userError,
          );
          emailCache.set(profile.id, null);
          return {
            ...profile,
            email: null,
          };
        }

        const email = userData?.user?.email || null;
        emailCache.set(profile.id, email);
        return {
          ...profile,
          email,
        };
      } catch (error) {
        console.warn(
          `Auth API threw while fetching user ${profile.id}:`,
          error instanceof Error ? error.message : error,
        );
        emailCache.set(profile.id, null);
        return {
          ...profile,
          email: null,
        };
      }
    }),
  );

  console.log(
    `Fetched emails for ${usersWithEmails.filter((u) => u.email).length} out of ${profiles?.length || 0} profiles`,
  );

  const users = usersWithEmails;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-4 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 p-6 shadow-lg">
        <div className="mb-2 inline-block rounded-2xl border-4 border-purple-300 bg-purple-400 px-4 py-1">
          <p className="text-sm font-black uppercase tracking-wide text-purple-900">
            Admin Panel
          </p>
        </div>
        <h1 className="text-3xl font-black text-violet-900">User Management</h1>
        <p className="text-base font-semibold text-violet-700">
          Manage users, roles, and access levels for the entire system.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/dashboard/admin/badges"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:scale-105"
          >
            Manage Badges
          </Link>
          <Link
            href="/dashboard/admin/broadcasts"
            className="inline-flex items-center gap-2 rounded-full border-2 border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Login Messages
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border-2 border-purple-200 bg-white px-4 py-2 text-sm font-bold text-purple-700 shadow-sm transition hover:bg-purple-50"
          >
            📊 System Overview
          </Link>
        </div>
      </header>

      <AdminUserTable users={users} />
    </div>
  );
}
