import Link from "next/link";
import { BroadcastManager } from "@/components/dashboard/BroadcastManager";
import { requireRole } from "@/lib/auth/roleCheck";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LoginBroadcast } from "@/lib/broadcasts";

export const dynamic = "force-dynamic";

type BroadcastRow = LoginBroadcast & { isActive?: boolean };

export default async function AdminBroadcastsPage() {
  await requireRole(["ADMIN"]);
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("login_broadcasts")
    .select("id, title, body, tone, link_label, link_url, created_at, is_active")
    .order("created_at", { ascending: false });

  const broadcasts: BroadcastRow[] =
    data?.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      tone: (row.tone ?? "info") as LoginBroadcast["tone"],
      linkLabel: row.link_label,
      linkUrl: row.link_url,
      createdAt: row.created_at,
      isActive: row.is_active,
    })) ?? [];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border-4 border-indigo-300 bg-gradient-to-br from-indigo-50 to-sky-50 p-6 shadow-lg">
        <div className="mb-2 inline-block rounded-2xl border-4 border-indigo-200 bg-indigo-500/80 px-4 py-1 text-white">
          <p className="text-sm font-black uppercase tracking-wide">Admin Panel</p>
        </div>
        <h1 className="text-3xl font-black text-indigo-900">
          Login Broadcasts
        </h1>
        <p className="text-base font-semibold text-indigo-700">
          Publish short changelog or status notes that appear on the login page.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 rounded-full border-2 border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            Back to admin home
          </Link>
        </div>
      </header>

      <BroadcastManager broadcasts={broadcasts} />
    </div>
  );
}
