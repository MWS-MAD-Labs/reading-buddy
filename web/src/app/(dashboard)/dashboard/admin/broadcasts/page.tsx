import Link from "next/link";
import { BroadcastManager } from "@/components/dashboard/BroadcastManager";
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
import type { LoginBroadcast } from "@/lib/broadcasts";
import { cn } from "@/lib/cn";

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
      <Card variant="glow" padding="cozy">
        <CardHeader className="mb-5">
          <Badge variant="neutral" className="w-fit">
            Admin panel
          </Badge>
          <CardTitle className="text-3xl text-[#7E1518] md:text-4xl">
            Login Broadcasts
          </CardTitle>
          <CardDescription className="max-w-2xl">
            Publish short changelog or status notes that appear on the login
            page.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin"
            className={cn(buttonVariants({ variant: "neutral", size: "sm" }))}
          >
            Back to admin home
          </Link>
        </div>
      </Card>

      <BroadcastManager broadcasts={broadcasts} />
    </div>
  );
}
