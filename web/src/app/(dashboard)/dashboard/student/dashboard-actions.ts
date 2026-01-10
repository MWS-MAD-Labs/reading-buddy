"use server";

import { queryWithContext } from "@/lib/db";
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
    // 0. Get profile ID
    const profileResult = await queryWithContext(
      userId,
      `SELECT id FROM profiles WHERE user_id = $1`,
      [userId]
    );
    const profileId = profileResult.rows[0]?.id;

    if (!profileId) {
      return { success: false, error: "Profile not found" };
    }

    // 1. Get gamification stats
    const gamificationStats = await getGamificationStats(userId, profileId);

    // 2. Get current reading book (most recent)
    // Replaced Supabase query with direct SQL
    const currentReadingResult = await queryWithContext(
      userId,
      `
      SELECT 
        sb.book_id, 
        sb.current_page, 
        b.id, 
        b.title, 
        b.author, 
        b.cover_url
      FROM student_books sb
      JOIN books b ON sb.book_id = b.id
      WHERE sb.student_id = $1
      ORDER BY sb.started_at DESC
      LIMIT 1
      `,
      [profileId]
    );

    let currentBook = null;
    const currentReading = currentReadingResult.rows[0];

    if (currentReading) {
      // Get total pages from the book (you might need to add this field or calculate it)
      // For now, we'll estimate based on a typical book
      const estimatedTotalPages = 300; // TODO: Get actual page count from book metadata
      const currentPage = currentReading.current_page || 1;
      const progressPercentage = Math.min(
        (currentPage / estimatedTotalPages) * 100,
        100,
      );

      currentBook = {
        id: currentReading.id, // book id from join
        title: currentReading.title,
        author: currentReading.author,
        cover_url: currentReading.cover_url,
        current_page: currentPage,
        total_pages: estimatedTotalPages,
        progress_percentage: progressPercentage,
      };
    }

    // 3. Generate weekly challenge (based on current progress)
    // For now, we'll create a simple reading challenge
    const pagesReadThisWeek = 0; // TODO: Calculate actual pages this week from xp_transactions
    const weeklyChallenge = {
      id: "weekly-reading-challenge",
      title: "Read 100 Pages",
      description: "Complete 100 pages this week",
      goal: 100,
      progress: Math.min(pagesReadThisWeek % 100, 100), // Simplified for demo
      xpReward: 500,
      icon: "📖",
    };

    // 4. Get leaderboard (top 50 students by XP)
    const leaderboardResult = await queryWithContext(
      userId,
      `
      SELECT id, full_name, total_xp, level
      FROM profiles
      WHERE role = 'STUDENT'
      ORDER BY total_xp DESC
      LIMIT 50
      `
    );

    const leaderboardData =
      leaderboardResult.rows.map((profile, index) => ({
        rank: index + 1,
        studentId: profile.id,
        name: profile.full_name || "Anonymous",
        xp: profile.total_xp || 0,
        level: profile.level || 1,
        isCurrentUser: profile.id === userId,
      })) || [];

    const currentUserRank =
      leaderboardData.find((entry) => entry.studentId === userId)?.rank || null;
    const totalStudents = leaderboardResult.rows.length || 0; // This might need a separate COUNT query if we want true total, but matching original logic

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
