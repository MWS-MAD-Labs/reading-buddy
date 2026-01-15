import { query } from "@/lib/db";

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
    try {
      const result = await query(
        `SELECT id, title, body, tone, link_label, link_url, created_at
         FROM login_broadcasts
         WHERE is_active = true
         ORDER BY created_at DESC
         LIMIT 1`
      );

      const broadcast = result.rows[0];

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
      console.error("[login_broadcasts] fetch error:", error);
      return null;
    }
  };
