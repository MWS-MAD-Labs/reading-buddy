"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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
  currentUserId: string,
  limit: number = 50,
): Promise<{ success: boolean; data?: LeaderboardData; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();

    // Get all students
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "STUDENT");

    if (error) {
      console.error("Error fetching student leaderboard:", error);
      return { success: false, error: "Failed to fetch leaderboard" };
    }

    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        data: {
          entries: [],
          currentUserEntry: null,
          totalParticipants: 0,
        },
      };
    }

    // Get gamification stats for each student
    const entriesWithStats = await Promise.all(
      profiles.map(async (profile) => {
        const stats = await getGamificationStats(supabase, profile.id);
        return {
          userId: profile.id,
          name: profile.full_name || "Anonymous Student",
          xp: stats?.xp || 0,
          level: stats?.level || 1,
          booksCompleted: stats?.total_books_completed || 0,
          pagesRead: stats?.total_pages_read || 0,
          readingStreak: stats?.reading_streak || 0,
          isCurrentUser: profile.id === currentUserId,
        };
      }),
    );

    // Sort by XP descending, then by level
    const sortedEntries = entriesWithStats
      .sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        return b.level - a.level;
      })
      .slice(0, limit);

    // Add ranks
    const entries: LeaderboardEntry[] = sortedEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Find current user's entry
    const currentUserEntry = entries.find((e) => e.isCurrentUser) || null;

    return {
      success: true,
      data: {
        entries,
        currentUserEntry,
        totalParticipants: profiles.length,
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
  currentUserId: string,
  limit: number = 50,
): Promise<{ success: boolean; data?: LeaderboardData; error?: string }> {
  try {
    const supabase = getSupabaseAdminClient();

    // Get all staff members
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["TEACHER", "LIBRARIAN", "ADMIN"]);

    if (error) {
      console.error("Error fetching staff leaderboard:", error);
      return { success: false, error: "Failed to fetch leaderboard" };
    }

    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        data: {
          entries: [],
          currentUserEntry: null,
          totalParticipants: 0,
        },
      };
    }

    // Get gamification stats for each staff member
    const entriesWithStats = await Promise.all(
      profiles.map(async (profile) => {
        const stats = await getGamificationStats(supabase, profile.id);
        return {
          userId: profile.id,
          name:
            profile.full_name ||
            `Anonymous ${profile.role?.toLowerCase() || "staff"}`,
          xp: stats?.xp || 0,
          level: stats?.level || 1,
          booksCompleted: stats?.total_books_completed || 0,
          pagesRead: stats?.total_pages_read || 0,
          readingStreak: stats?.reading_streak || 0,
          isCurrentUser: profile.id === currentUserId,
        };
      }),
    );

    // Sort by XP descending, then by level
    const sortedEntries = entriesWithStats
      .sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        return b.level - a.level;
      })
      .slice(0, limit);

    // Add ranks
    const entries: LeaderboardEntry[] = sortedEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Find current user's entry
    const currentUserEntry = entries.find((e) => e.isCurrentUser) || null;

    return {
      success: true,
      data: {
        entries,
        currentUserEntry,
        totalParticipants: profiles.length,
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
  currentUserId: string,
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
      ? await getStudentLeaderboard(currentUserId, 3)
      : await getStaffLeaderboard(currentUserId, 3);

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
