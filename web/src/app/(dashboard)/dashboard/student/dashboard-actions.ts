"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getGamificationStats } from "@/lib/gamification";

export type StudentDashboardData = {
  gamificationStats: Awaited<ReturnType<typeof getGamificationStats>> | null;
  currentBook: {
    id: number;
    title: string;
    author: string;
    cover_url: string;
    current_page: number;
    total_pages: number;
    progress_percentage: number;
  } | null;
  weeklyChallenge: {
    id: string;
    title: string;
    description: string;
    goal: number;
    progress: number;
    xpReward: number;
    icon: string;
  };
  leaderboard: Array<{
    rank: number;
    studentId: string;
    name: string;
    xp: number;
    level: number;
    isCurrentUser: boolean;
  }>;
  currentUserRank: number | null;
  totalStudents: number;
};

export async function getStudentDashboardData(
  userId: string,
): Promise<{ success: boolean; data?: StudentDashboardData; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();

    // 1. Get gamification stats
    const gamificationStats = await getGamificationStats(supabase, userId);

    // 2. Get current reading book (most recent)
    const { data: currentReading } = await supabase
      .from("student_books")
      .select("book_id, current_page, books(id, title, author, cover_url)")
      .eq("student_id", userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    let currentBook = null;
    if (currentReading && currentReading.books) {
      const bookData = Array.isArray(currentReading.books)
        ? currentReading.books[0]
        : currentReading.books;
      const book = bookData as {
        id: number;
        title: string;
        author: string;
        cover_url: string;
      } | null;

      if (book) {
        // Get total pages from the book (you might need to add this field or calculate it)
        // For now, we'll estimate based on a typical book
        const estimatedTotalPages = 300; // TODO: Get actual page count from book metadata
        const currentPage = currentReading.current_page || 1;
        const progressPercentage = Math.min(
          (currentPage / estimatedTotalPages) * 100,
          100,
        );

        currentBook = {
          id: book.id,
          title: book.title,
          author: book.author,
          cover_url: book.cover_url,
          current_page: currentPage,
          total_pages: estimatedTotalPages,
          progress_percentage: progressPercentage,
        };
      }
    }

    // 3. Generate weekly challenge (based on current progress)
    // For now, we'll create a simple reading challenge
    const pagesReadThisWeek = gamificationStats?.pages_read || 0; // TODO: Calculate actual pages this week
    const weeklyChallenge = {
      id: "weekly-reading-challenge",
      title: "Read 100 Pages",
      description: "Complete 100 pages this week",
      goal: 100,
      progress: Math.min(pagesReadThisWeek % 100, 100), // Simplified for demo
      xpReward: 500,
      icon: "📖",
    };

    // 4. Get leaderboard (top 5 students by XP)
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, total_xp, level")
      .eq("role", "STUDENT")
      .order("total_xp", { ascending: false })
      .limit(50); // Get top 50 to find current user's rank

    const leaderboardData =
      allProfiles?.map((profile, index) => ({
        rank: index + 1,
        studentId: profile.id,
        name: profile.full_name || "Anonymous",
        xp: profile.total_xp || 0,
        level: profile.level || 1,
        isCurrentUser: profile.id === userId,
      })) || [];

    const currentUserRank =
      leaderboardData.find((entry) => entry.studentId === userId)?.rank || null;
    const totalStudents = allProfiles?.length || 0;

    // Get top 3 for preview
    const leaderboard = leaderboardData.slice(0, 3);

    // If current user is not in top 3, add them
    if (
      currentUserRank &&
      currentUserRank > 3 &&
      !leaderboard.some((e) => e.isCurrentUser)
    ) {
      const currentUserEntry = leaderboardData.find(
        (e) => e.studentId === userId,
      );
      if (currentUserEntry) {
        leaderboard.push(currentUserEntry);
      }
    }

    return {
      success: true,
      data: {
        gamificationStats,
        currentBook,
        weeklyChallenge,
        leaderboard,
        currentUserRank,
        totalStudents,
      },
    };
  } catch (error) {
    console.error("Error fetching student dashboard data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
