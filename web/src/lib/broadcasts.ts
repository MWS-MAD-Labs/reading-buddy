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

export const getLatestLoginBroadcast =
  async (): Promise<LoginBroadcast | null> => {
    const supabase = getSupabaseAdminClient();

    // Return null if Supabase is not configured (PostgreSQL migration)
    if (!supabase) {
      return null;
    }

    // Add retry logic for transient network failures
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { data, error } = await supabase
          .from("login_broadcasts")
          .select("id, title, body, tone, link_label, link_url, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          throw error;
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
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on non-network errors
        if (
          !lastError.message.includes("fetch failed") &&
          !lastError.message.includes("ENOTFOUND")
        ) {
          console.error("[login_broadcasts] fetch error:", lastError.message);
          return null;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < 2) {
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * Math.pow(2, attempt)),
          );
        }
      }
    }

    if (lastError) {
      console.error(
        "[login_broadcasts] fetch error after retries:",
        lastError.message,
      );
    }

    return null;
  };
