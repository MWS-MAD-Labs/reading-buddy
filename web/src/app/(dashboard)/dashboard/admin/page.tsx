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

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }

  // Fetch user emails using RPC function (workaround for auth.admin.listUsers() issues)
  const { data: userEmails, error: emailError } = await supabaseAdmin.rpc(
    "get_all_user_emails",
  );

  if (emailError) {
    console.error("Error fetching user emails:", emailError);
  }

  // Merge profile data with email
  const users =
    profiles?.map((profile) => {
      const emailData = userEmails?.find((e: any) => e.user_id === profile.id);
      return {
        ...profile,
        email: emailData?.email || null,
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
      </header>

      <AdminUserTable users={users} />
    </div>
  );
}
