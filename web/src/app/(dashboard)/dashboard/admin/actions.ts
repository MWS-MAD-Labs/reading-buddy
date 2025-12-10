"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type SystemStats = {
  userCounts: {
    students: number;
    teachers: number;
    librarians: number;
    admins: number;
    total: number;
  };
  bookStats: {
    total: number;
    byFormat: {
      pdf: number;
      epub: number;
      mobi: number;
      azw: number;
      azw3: number;
    };
  };
  activeReaders: {
    count: number;
    percentageChange: number; // vs previous 7 days
  };
  aiUsage: {
    quizzesGenerated: number;
    descriptionsGenerated: number;
    currentProvider: "cloud" | "local";
  };
};

export async function getSystemStats(): Promise<{
  success: boolean;
  data?: SystemStats;
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();

    // 1. Get user counts by role
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("role");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return { success: false, error: "Failed to fetch user counts" };
    }

    const userCounts = {
      students: profiles.filter((p) => p.role === "STUDENT").length,
      teachers: profiles.filter((p) => p.role === "TEACHER").length,
      librarians: profiles.filter((p) => p.role === "LIBRARIAN").length,
      admins: profiles.filter((p) => p.role === "ADMIN").length,
      total: profiles.length,
    };

    // 2. Get book stats with format breakdown
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("file_format");

    if (booksError) {
      console.error("Error fetching books:", booksError);
      return { success: false, error: "Failed to fetch book stats" };
    }

    const bookStats = {
      total: books.length,
      byFormat: {
        pdf: books.filter((b) => b.file_format === "pdf").length,
        epub: books.filter((b) => b.file_format === "epub").length,
        mobi: books.filter((b) => b.file_format === "mobi").length,
        azw: books.filter((b) => b.file_format === "azw").length,
        azw3: books.filter((b) => b.file_format === "azw3").length,
      },
    };

    // 3. Get active readers (read in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: recentReaders, error: recentReadersError } = await supabase
      .from("profiles")
      .select("id, last_read_date")
      .gte("last_read_date", sevenDaysAgo.toISOString());

    const { data: previousReaders, error: previousReadersError } =
      await supabase
        .from("profiles")
        .select("id")
        .gte("last_read_date", fourteenDaysAgo.toISOString())
        .lt("last_read_date", sevenDaysAgo.toISOString());

    if (recentReadersError || previousReadersError) {
      console.error(
        "Error fetching active readers:",
        recentReadersError || previousReadersError,
      );
    }

    const currentCount = recentReaders?.length || 0;
    const previousCount = previousReaders?.length || 0;
    const percentageChange =
      previousCount > 0
        ? ((currentCount - previousCount) / previousCount) * 100
        : currentCount > 0
          ? 100
          : 0;

    const activeReaders = {
      count: currentCount,
      percentageChange: Math.round(percentageChange),
    };

    // 4. Get AI usage stats (quizzes generated this month)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select("id, created_at")
      .gte("created_at", firstDayOfMonth.toISOString());

    if (quizzesError) {
      console.error("Error fetching quizzes:", quizzesError);
    }

    // Count descriptions by checking books with ai_description
    const { data: descriptionsCount, error: descriptionsError } = await supabase
      .from("books")
      .select("id", { count: "exact", head: true })
      .not("ai_description", "is", null);

    if (descriptionsError) {
      console.error("Error fetching descriptions:", descriptionsError);
    }

    const aiUsage = {
      quizzesGenerated: quizzes?.length || 0,
      descriptionsGenerated: descriptionsCount || 0,
      currentProvider:
        (process.env.AI_PROVIDER as "cloud" | "local") || "local",
    };

    const stats: SystemStats = {
      userCounts,
      bookStats,
      activeReaders,
      aiUsage,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error in getSystemStats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
