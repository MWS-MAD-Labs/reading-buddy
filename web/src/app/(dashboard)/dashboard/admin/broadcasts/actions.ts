"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roleCheck";
import { query } from "@/lib/db";
import type { LoginBroadcast } from "@/lib/broadcasts";

export type BroadcastInput = {
  title: string;
  body: string;
  tone?: LoginBroadcast["tone"];
  linkLabel?: string;
  linkUrl?: string;
  isActive?: boolean;
};

const normalize = (
  row: Record<string, unknown>,
): LoginBroadcast & { isActive?: boolean } => ({
  id: String(row.id),
  title: String(row.title),
  body: String(row.body),
  tone: (row.tone ?? "info") as LoginBroadcast["tone"],
  linkLabel: (row.link_label as string | null) ?? null,
  linkUrl: (row.link_url as string | null) ?? null,
  createdAt: (row.created_at as string | null) ?? null,
  isActive: Boolean(row.is_active),
});

export const createBroadcast = async (input: BroadcastInput) => {
  await requireRole(["ADMIN"]);

  try {
    const { rows } = await query(
      `INSERT INTO login_broadcasts (title, body, tone, link_label, link_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, body, tone, link_label, link_url, created_at, is_active`,
      [
        input.title,
        input.body,
        input.tone ?? "info",
        input.linkLabel || null,
        input.linkUrl || null,
        input.isActive ?? true,
      ]
    );

    const data = rows[0];

    revalidatePath("/login");
    revalidatePath("/dashboard/admin/broadcasts");

    return { success: true, broadcast: normalize(data) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to create broadcast.",
    };
  }
};

export const setBroadcastActive = async (id: string, isActive: boolean) => {
  await requireRole(["ADMIN"]);

  try {
    const { rows } = await query(
      `UPDATE login_broadcasts
       SET is_active = $1
       WHERE id = $2
       RETURNING id, title, body, tone, link_label, link_url, created_at, is_active`,
      [isActive, id]
    );

    const data = rows[0];

    if (!data) {
      return { success: false, error: "Broadcast not found." };
    }

    revalidatePath("/login");
    revalidatePath("/dashboard/admin/broadcasts");

    return { success: true, broadcast: normalize(data) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to update broadcast.",
    };
  }
};
