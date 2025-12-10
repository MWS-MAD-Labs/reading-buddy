import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type LoginBroadcast = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warning" | "alert";
  linkLabel?: string | null;
  linkUrl?: string | null;
  createdAt?: string | null;
};

export const getLatestLoginBroadcast = async (): Promise<LoginBroadcast | null> => {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("login_broadcasts")
    .select("id, title, body, tone, link_label, link_url, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[login_broadcasts] fetch error:", error.message);
    return null;
  }

  const broadcast = data?.[0];
  if (!broadcast) {
    return null;
  }

  return {
    id: broadcast.id,
    title: broadcast.title,
    body: broadcast.body,
    tone: (broadcast.tone ?? "info") as LoginBroadcast["tone"],
    linkLabel: broadcast.link_label,
    linkUrl: broadcast.link_url,
    createdAt: broadcast.created_at,
  };
};
