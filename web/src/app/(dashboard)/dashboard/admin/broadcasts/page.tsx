import Link from "next/link";
import { BroadcastManager } from "@/components/dashboard/BroadcastManager";
import { requireRole } from "@/lib/auth/roleCheck";
import { query } from "@/lib/db";
import type { LoginBroadcast } from "@/lib/broadcasts";

export const dynamic = "force-dynamic";

type BroadcastRow = LoginBroadcast & { isActive?: boolean };

export default async function AdminBroadcastsPage() {
  await requireRole(["ADMIN"]);

  const { rows } = await query(
    `SELECT id, title, body, tone, link_label, link_url, created_at, is_active
     FROM login_broadcasts
     ORDER BY created_at DESC`,
  );

  const broadcasts: BroadcastRow[] = rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    tone: (row.tone ?? "info") as LoginBroadcast["tone"],
    linkLabel: row.link_label,
    linkUrl: row.link_url,
    createdAt: row.created_at,
    isActive: row.is_active,
  }));

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[#B8DDF8]/60 bg-gradient-to-br from-white to-[#EFF8FE] p-6 soft-shadow">
        <div className="heading-font mb-3 inline-flex rounded-full bg-[#E9EDF6] px-4 py-1 text-xs font-bold uppercase tracking-[0.22em] text-[#1F2A44]">
          Admin panel
        </div>
        <h1 className="heading-font text-3xl font-extrabold text-[#7E1518]">
          Login Broadcasts
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[#5d4b4c]">
          Publish short changelog or status notes that appear on the login page.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin"
            className="heading-font inline-flex items-center gap-2 rounded-full border border-[#1F2A44]/15 bg-white px-4 py-2 text-sm font-bold text-[#1F2A44] transition hover:bg-[#E9EDF6]"
          >
            Back to admin home
          </Link>
        </div>
      </header>

      <BroadcastManager broadcasts={broadcasts} />
    </div>
  );
}
