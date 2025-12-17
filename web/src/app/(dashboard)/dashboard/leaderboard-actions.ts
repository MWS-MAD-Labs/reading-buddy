"use server";

import { queryWithContext } from "@/lib/db";
import { getGamificationStats } from "@/lib/gamification";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  level: number;
  booksCompleted: number;
  pagesRead: number;
  readingStreak: number;
  isCurrentUser: boolean;
};

export type LeaderboardData = {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  totalParticipants: number;
};

/**
 * Get student leaderboard (only STUDENT role)
 */
export async function getStudentLeaderboard(
  userId: string,
  currentProfileId: string,
  limit: number = 50,
): Promise<{ success: boolean; data?: LeaderboardData; error?: string }> {
  try {
    // Get all students with their stats
    const result = await queryWithContext(
      userId,
      `SELECT
        id,
        full_name,
        xp,
        level,
        total_books_completed,
        total_pages_read,
        reading_streak
      FROM profiles
      WHERE role = 'STUDENT'
      ORDER BY xp DESC, level DESC
      LIMIT $1`,
      [limit],
    );

    if (result.rows.length === 0) {
      return {
        success: true,
        data: {
          entries: [],
          currentUserEntry: null,
          totalParticipants: 0,
        },
      };
    }

    // Get total count
    const countResult = await queryWithContext(
      userId,
      `SELECT COUNT(*) as count FROM profiles WHERE role = 'STUDENT'`,
      [],
    );
    const totalParticipants = parseInt(countResult.rows[0]?.count || "0");

    // Map to leaderboard entries
    const entries: LeaderboardEntry[] = result.rows.map((profile, index) => ({
      rank: index + 1,
      userId: profile.id,
      name: profile.full_name || "Anonymous Student",
      xp: profile.xp || 0,
      level: profile.level || 1,
      booksCompleted: profile.total_books_completed || 0,
      pagesRead: profile.total_pages_read || 0,
      readingStreak: profile.reading_streak || 0,
      isCurrentUser: profile.id === currentProfileId,
    }));

    // Find current user's entry
    const currentUserEntry = entries.find((e) => e.isCurrentUser) || null;

    return {
      success: true,
      data: {
        entries,
        currentUserEntry,
        totalParticipants,
      },
    };
  } catch (error) {
    console.error("Error in getStudentLeaderboard:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get staff leaderboard (TEACHER, LIBRARIAN, ADMIN)
 */
export async function getStaffLeaderboard(
  userId: string,
  currentProfileId: string,
  limit: number = 50,
): Promise<{ success: boolean; data?: LeaderboardData; error?: string }> {
  try {
    // Get all staff members with their stats
    const result = await queryWithContext(
      userId,
      `SELECT
        id,
        full_name,
        role,
        xp,
        level,
        total_books_completed,
        total_pages_read,
        reading_streak
      FROM profiles
      WHERE role IN ('TEACHER', 'LIBRARIAN', 'ADMIN')
      ORDER BY xp DESC, level DESC
      LIMIT $1`,
      [limit],
    );

    if (result.rows.length === 0) {
      return {
        success: true,
        data: {
          entries: [],
          currentUserEntry: null,
          totalParticipants: 0,
        },
      };
    }

    // Get total count
    const countResult = await queryWithContext(
      userId,
      `SELECT COUNT(*) as count FROM profiles WHERE role IN ('TEACHER', 'LIBRARIAN', 'ADMIN')`,
      [],
    );
    const totalParticipants = parseInt(countResult.rows[0]?.count || "0");

    // Map to leaderboard entries
    const entries: LeaderboardEntry[] = result.rows.map((profile, index) => ({
      rank: index + 1,
      userId: profile.id,
      name:
        profile.full_name ||
        `Anonymous ${profile.role?.toLowerCase() || "staff"}`,
      xp: profile.xp || 0,
      level: profile.level || 1,
      booksCompleted: profile.total_books_completed || 0,
      pagesRead: profile.total_pages_read || 0,
      readingStreak: profile.reading_streak || 0,
      isCurrentUser: profile.id === currentProfileId,
    }));

    // Find current user's entry
    const currentUserEntry = entries.find((e) => e.isCurrentUser) || null;

    return {
      success: true,
      data: {
        entries,
        currentUserEntry,
        totalParticipants,
      },
    };
  } catch (error) {
    console.error("Error in getStaffLeaderboard:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get combined leaderboard stats for preview
 */
export async function getLeaderboardPreview(
  userId: string,
  currentProfileId: string,
  role: string,
): Promise<{
  success: boolean;
  data?: {
    topStudents: LeaderboardEntry[];
    topStaff: LeaderboardEntry[];
    currentUserRank: number | null;
    totalInCategory: number;
  };
  error?: string;
}> {
  try {
    const isStudent = role === "STUDENT";

    // Get appropriate leaderboard
    const result = isStudent
      ? await getStudentLeaderboard(userId, currentProfileId, 3)
      : await getStaffLeaderboard(userId, currentProfileId, 3);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        topStudents: isStudent ? result.data.entries : [],
        topStaff: !isStudent ? result.data.entries : [],
        currentUserRank: result.data.currentUserEntry?.rank || null,
        totalInCategory: result.data.totalParticipants,
      },
    };
  } catch (error) {
    console.error("Error in getLeaderboardPreview:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
