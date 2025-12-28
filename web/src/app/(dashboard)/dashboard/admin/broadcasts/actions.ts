"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roleCheck";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Database connection not available." };
  }

  const { data, error } = await supabase
    .from("login_broadcasts")
    .insert({
      title: input.title,
      body: input.body,
      tone: input.tone ?? "info",
      link_label: input.linkLabel,
      link_url: input.linkUrl,
      is_active: input.isActive ?? true,
    })
    .select(
      "id, title, body, tone, link_label, link_url, created_at, is_active",
    )
    .single();

  revalidatePath("/login");
  revalidatePath("/dashboard/admin/broadcasts");

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to create broadcast.",
    };
  }

  return { success: true, broadcast: normalize(data) };
};

export const setBroadcastActive = async (id: string, isActive: boolean) => {
  await requireRole(["ADMIN"]);
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { success: false, error: "Database connection not available." };
  }

  const { data, error } = await supabase
    .from("login_broadcasts")
    .update({ is_active: isActive })
    .eq("id", id)
    .select(
      "id, title, body, tone, link_label, link_url, created_at, is_active",
    )
    .single();

  revalidatePath("/login");
  revalidatePath("/dashboard/admin/broadcasts");

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update broadcast.",
    };
  }

  return { success: true, broadcast: normalize(data) };
};
