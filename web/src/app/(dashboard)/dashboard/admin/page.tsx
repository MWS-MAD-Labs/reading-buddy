import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  // Fetch auth users directly from auth.users table using raw SQL
  // This bypasses the Auth API which seems to have database permission issues
  const { data: authUsers, error: authError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .limit(1000);

  console.log("Fetching emails directly from auth schema...");

  // Use RPC or raw query to get emails from auth.users
  // Since we can't directly query auth.users from the client, we'll use the admin API differently
  const { data: authData, error: listError } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (listError) {
    console.error("Auth API error:", listError);
    console.log("Attempting alternative method: querying individual users...");

    // Fallback: Try to get user data individually for each profile
    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.getUserById(profile.id);

        if (userError) {
          console.error(`Error fetching user ${profile.id}:`, userError);
        }

        return {
          ...profile,
          email: userData?.user?.email || null,
        };
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
          <h1 className="text-3xl font-black text-violet-900">
            User Management
          </h1>
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
          </div>
        </header>

        <AdminUserTable users={users} />
      </div>
    );
  }

  console.log(`Total auth users fetched: ${authData.users.length}`);
  console.log(`Total profiles: ${profiles?.length || 0}`);

  // Merge profile data with email
  const users =
    profiles?.map((profile) => {
      const authUser = authData.users.find(
        (u: { id: string; email?: string }) => u.id === profile.id,
      );
      return {
        ...profile,
        email: authUser?.email || null,
      };
    }) ?? [];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-4 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 p-6 shadow-lg">
        <div className="mb-2 inline-block rounded-2xl border-4 border-purple-300 bg-purple-400 px-4 py-1">
          <p className="text-sm font-black uppercase tracking-wide text-purple-900">
            ⚙️ Admin Panel
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
        </div>
      </header>

      <AdminUserTable users={users} />
    </div>
  );
}
