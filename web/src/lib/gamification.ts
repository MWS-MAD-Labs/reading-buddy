/**
 * Gamification System
 *
 * Handles XP awards, badge evaluation, streak tracking, and level calculations.
 * This is the core engine for the Reading Buddy gamification system.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  Badge,
  BadgeCriteria,
  StudentBadge,
  XPSource,
  ProfileGamificationStats,
} from "@/types/database";

// ============================================================================
// XP Constants
// ============================================================================

export const XP_REWARDS = {
  PAGE_READ: 1,
  BOOK_COMPLETED: 100,
  QUIZ_COMPLETED: 50,
  QUIZ_PERFECT: 100, // Bonus for 100% score
  QUIZ_HIGH_SCORE: 25, // Bonus for 90%+ score
  STREAK_DAILY: 10, // Daily streak bonus
  STREAK_WEEKLY: 50, // 7-day streak bonus
  STREAK_MONTHLY: 200, // 30-day streak bonus
} as const;

// ============================================================================
// Level Calculation
// ============================================================================

/**
 * Calculate level from XP using a square root formula
 * Level thresholds: 0-49=1, 50-199=2, 200-449=3, 450-799=4, etc.
 */
export function calculateLevel(xp: number): number {
  return Math.min(Math.floor(Math.sqrt(xp / 50)) + 1, 100);
}

/**
 * Calculate XP required to reach a specific level
 */
export function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 50;
}

/**
 * Get XP needed for next level
 */
export function xpToNextLevel(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  return nextLevelXp - currentXp;
}

/**
 * Get progress percentage to next level
 */
export function levelProgressPercent(currentXp: number): number {
  const currentLevel = calculateLevel(currentXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const progressInLevel = currentXp - currentLevelXp;
  const levelRange = nextLevelXp - currentLevelXp;
  return Math.round((progressInLevel / levelRange) * 100);
}

/**
 * Get title/rank based on level
 */
export function getLevelTitle(level: number): string {
  if (level >= 50) return "Reading Legend";
  if (level >= 40) return "Master Reader";
  if (level >= 30) return "Expert Reader";
  if (level >= 20) return "Avid Reader";
  if (level >= 10) return "Book Explorer";
  if (level >= 5) return "Rising Reader";
  return "Beginner Reader";
}

// ============================================================================
// XP Award Functions
// ============================================================================

interface AwardXPResult {
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  xpAwarded: number;
}

/**
 * Award XP to a student and update their level
 */
export async function awardXP(
  supabase: SupabaseClient,
  studentId: string,
  amount: number,
  source: XPSource,
  sourceId?: string,
  description?: string,
): Promise<AwardXPResult> {
  // Get current XP and level
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("xp, level")
    .eq("id", studentId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Failed to get profile: ${profileError?.message}`);
  }

  const oldXp = profile.xp ?? 0;
  const oldLevel = profile.level ?? 1;
  const newXp = oldXp + amount;
  const newLevel = calculateLevel(newXp);

  // Update profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ xp: newXp, level: newLevel })
    .eq("id", studentId);

  if (updateError) {
    throw new Error(`Failed to update XP: ${updateError.message}`);
  }

  // Record transaction
  const { error: txError } = await supabase.from("xp_transactions").insert({
    student_id: studentId,
    amount,
    source,
    source_id: sourceId,
    description,
  });

  if (txError) {
    console.error("Failed to record XP transaction:", txError);
  }

  return {
    newXp,
    newLevel,
    leveledUp: newLevel > oldLevel,
    xpAwarded: amount,
  };
}

// ============================================================================
// Streak Functions
// ============================================================================

interface UpdateStreakResult {
  currentStreak: number;
  longestStreak: number;
  isNewStreak: boolean;
  streakBonusXp: number;
}

/**
 * Update reading streak for a student
 */
export async function updateReadingStreak(
  supabase: SupabaseClient,
  studentId: string,
): Promise<UpdateStreakResult> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Get current streak info
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("reading_streak, longest_streak, last_read_date")
    .eq("id", studentId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Failed to get profile: ${profileError?.message}`);
  }

  const lastRead = profile.last_read_date;
  let currentStreak = profile.reading_streak ?? 0;
  let longestStreak = profile.longest_streak ?? 0;
  let isNewStreak = false;
  let streakBonusXp = 0;

  if (!lastRead) {
    // First read ever
    currentStreak = 1;
    isNewStreak = true;
  } else {
    const lastReadDate = new Date(lastRead);
    const todayDate = new Date(today);
    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastReadStr = lastReadDate.toISOString().split("T")[0];
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastReadStr === today) {
      // Already read today, no change
      isNewStreak = false;
    } else if (lastReadStr === yesterdayStr) {
      // Consecutive day - extend streak
      currentStreak += 1;
      isNewStreak = true;
    } else {
      // Streak broken - start new
      currentStreak = 1;
      isNewStreak = true;
    }
  }

  // Update longest streak if needed
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Calculate streak bonus XP
  if (isNewStreak) {
    streakBonusXp = XP_REWARDS.STREAK_DAILY;

    // Milestone bonuses
    if (currentStreak === 7) {
      streakBonusXp += XP_REWARDS.STREAK_WEEKLY;
    } else if (currentStreak === 30) {
      streakBonusXp += XP_REWARDS.STREAK_MONTHLY;
    }
  }

  // Update profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      reading_streak: currentStreak,
      longest_streak: longestStreak,
      last_read_date: today,
    })
    .eq("id", studentId);

  if (updateError) {
    throw new Error(`Failed to update streak: ${updateError.message}`);
  }

  // Award streak bonus XP if applicable
  if (streakBonusXp > 0) {
    await awardXP(
      supabase,
      studentId,
      streakBonusXp,
      "streak_bonus",
      `streak-${currentStreak}`,
      `${currentStreak}-day reading streak bonus`,
    );
  }

  return {
    currentStreak,
    longestStreak,
    isNewStreak,
    streakBonusXp,
  };
}

// ============================================================================
// Badge Evaluation Functions
// ============================================================================

interface EvaluateBadgesResult {
  newBadges: Badge[];
  totalXpAwarded: number;
}

/**
 * Evaluate and award badges for a student based on their current stats
 */
export async function evaluateBadges(
  supabase: SupabaseClient,
  studentId: string,
  context?: {
    bookId?: number;
    quizId?: number;
    quizScore?: number;
  },
): Promise<EvaluateBadgesResult> {
  // Get student's current stats
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "total_books_completed, total_pages_read, total_quizzes_completed, total_perfect_quizzes, reading_streak",
    )
    .eq("id", studentId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Failed to get profile: ${profileError?.message}`);
  }

  // Get all active badges
  const { data: badges, error: badgesError } = await supabase
    .from("badges")
    .select("*")
    .eq("is_active", true);

  if (badgesError || !badges) {
    throw new Error(`Failed to get badges: ${badgesError?.message}`);
  }

  // Get student's earned badges
  const { data: earnedBadges, error: earnedError } = await supabase
    .from("student_badges")
    .select("badge_id")
    .eq("student_id", studentId);

  if (earnedError) {
    throw new Error(`Failed to get earned badges: ${earnedError.message}`);
  }

  const earnedBadgeIds = new Set(earnedBadges?.map((b) => b.badge_id) ?? []);

  // Evaluate each badge
  const newBadges: Badge[] = [];
  let totalXpAwarded = 0;

  for (const badge of badges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    // Check if criteria is met
    const earned = evaluateBadgeCriteria(badge.criteria as BadgeCriteria, {
      booksCompleted: profile.total_books_completed ?? 0,
      pagesRead: profile.total_pages_read ?? 0,
      quizzesCompleted: profile.total_quizzes_completed ?? 0,
      perfectQuizzes: profile.total_perfect_quizzes ?? 0,
      readingStreak: profile.reading_streak ?? 0,
      quizScore: context?.quizScore,
    });

    if (earned) {
      // Award the badge
      const { error: insertError } = await supabase
        .from("student_badges")
        .insert({
          student_id: studentId,
          badge_id: badge.id,
          book_id: context?.bookId,
          quiz_id: context?.quizId,
        });

      if (!insertError) {
        newBadges.push(badge);

        // Award XP for the badge
        if (badge.xp_reward > 0) {
          await awardXP(
            supabase,
            studentId,
            badge.xp_reward,
            "badge_earned",
            badge.id,
            `Earned badge: ${badge.name}`,
          );
          totalXpAwarded += badge.xp_reward;
        }
      }
    }
  }

  return { newBadges, totalXpAwarded };
}

/**
 * Evaluate if a badge criteria is met
 */
function evaluateBadgeCriteria(
  criteria: BadgeCriteria,
  stats: {
    booksCompleted: number;
    pagesRead: number;
    quizzesCompleted: number;
    perfectQuizzes: number;
    readingStreak: number;
    quizScore?: number;
  },
): boolean {
  switch (criteria.type) {
    case "books_completed":
      return stats.booksCompleted >= (criteria.count ?? 1);

    case "pages_read":
      return stats.pagesRead >= (criteria.count ?? 1);

    case "quizzes_completed":
      return stats.quizzesCompleted >= (criteria.count ?? 1);

    case "perfect_quiz":
      return stats.quizScore === 100;

    case "perfect_streak":
      return stats.perfectQuizzes >= (criteria.count ?? 1);

    case "high_scores":
      // This would need additional tracking for consecutive high scores
      return false;

    case "reading_streak":
      return stats.readingStreak >= (criteria.days ?? 1);

    case "quiz_score":
      return (
        stats.quizScore !== undefined &&
        stats.quizScore >= (criteria.minScore ?? 90)
      );

    case "checkpoint_completion":
      // This would be tracked separately per book
      return false;

    case "book_with_checkpoints":
      // Tracked separately when book is completed with all checkpoints
      return false;

    default:
      return false;
  }
}

// ============================================================================
// Stats Update Functions
// ============================================================================

/**
 * Update student stats when they complete a page
 */
export async function onPageRead(
  supabase: SupabaseClient,
  studentId: string,
  bookId: number,
  pageNumber: number,
): Promise<void> {
  // Update total pages read
  const { error: updateError } = await supabase.rpc("increment_pages_read", {
    p_student_id: studentId,
    p_amount: 1,
  });

  if (updateError) {
    // Fallback if RPC doesn't exist
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_pages_read")
      .eq("id", studentId)
      .single();

    await supabase
      .from("profiles")
      .update({ total_pages_read: (profile?.total_pages_read ?? 0) + 1 })
      .eq("id", studentId);
  }

  // Update streak (once per day)
  await updateReadingStreak(supabase, studentId);

  // Award page XP
  await awardXP(
    supabase,
    studentId,
    XP_REWARDS.PAGE_READ,
    "page_read",
    `${bookId}-${pageNumber}`,
    `Read page ${pageNumber}`,
  );

  // Evaluate page-based badges
  await evaluateBadges(supabase, studentId, { bookId });
}

/**
 * Update student stats when they complete a book
 */
export async function onBookCompleted(
  supabase: SupabaseClient,
  studentId: string,
  bookId: number,
): Promise<EvaluateBadgesResult> {
  // Update total books completed
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_books_completed")
    .eq("id", studentId)
    .single();

  await supabase
    .from("profiles")
    .update({
      total_books_completed: (profile?.total_books_completed ?? 0) + 1,
    })
    .eq("id", studentId);

  // Award book completion XP
  await awardXP(
    supabase,
    studentId,
    XP_REWARDS.BOOK_COMPLETED,
    "book_completed",
    String(bookId),
    "Completed a book",
  );

  // Award book-specific completion badges
  const bookSpecificBadges = await awardBookSpecificBadges(
    supabase,
    studentId,
    bookId,
  );

  // Evaluate general badges
  const generalBadges = await evaluateBadges(supabase, studentId, { bookId });

  // Combine results
  return {
    newBadges: [...bookSpecificBadges.newBadges, ...generalBadges.newBadges],
    totalXpAwarded:
      bookSpecificBadges.totalXpAwarded + generalBadges.totalXpAwarded,
  };
}

/**
 * Award book-specific completion badges for a completed book
 */
async function awardBookSpecificBadges(
  supabase: SupabaseClient,
  studentId: string,
  bookId: number,
): Promise<EvaluateBadgesResult> {
  // Get book-specific badges for this book that the student hasn't earned
  const { data: badges, error: badgesError } = await supabase
    .from("badges")
    .select("*")
    .eq("is_active", true)
    .eq("book_id", bookId)
    .eq("badge_type", "book_completion_specific");

  if (badgesError || !badges || badges.length === 0) {
    return { newBadges: [], totalXpAwarded: 0 };
  }

  // Get student's earned badges for this book
  const { data: earnedBadges } = await supabase
    .from("student_badges")
    .select("badge_id")
    .eq("student_id", studentId);

  const earnedBadgeIds = new Set(earnedBadges?.map((b) => b.badge_id) ?? []);

  const newBadges: Badge[] = [];
  let totalXpAwarded = 0;

  for (const badge of badges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    // Award the badge
    const { error: insertError } = await supabase
      .from("student_badges")
      .insert({
        student_id: studentId,
        badge_id: badge.id,
        book_id: bookId,
      });

    if (!insertError) {
      newBadges.push(badge as Badge);

      // Award XP for the badge
      if (badge.xp_reward > 0) {
        await awardXP(
          supabase,
          studentId,
          badge.xp_reward,
          "badge_earned",
          badge.id,
          `Earned badge: ${badge.name}`,
        );
        totalXpAwarded += badge.xp_reward;
      }
    }
  }

  return { newBadges, totalXpAwarded };
}

/**
 * Update student stats when they complete a quiz
 */
export async function onQuizCompleted(
  supabase: SupabaseClient,
  studentId: string,
  quizId: number,
  score: number,
  totalQuestions: number,
): Promise<EvaluateBadgesResult> {
  const scorePercent = Math.round((score / totalQuestions) * 100);
  const isPerfect = scorePercent === 100;
  const isHighScore = scorePercent >= 90;

  // Update quiz stats
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_quizzes_completed, total_perfect_quizzes")
    .eq("id", studentId)
    .single();

  const updates: Record<string, number> = {
    total_quizzes_completed: (profile?.total_quizzes_completed ?? 0) + 1,
  };

  if (isPerfect) {
    updates.total_perfect_quizzes = (profile?.total_perfect_quizzes ?? 0) + 1;
  }

  await supabase.from("profiles").update(updates).eq("id", studentId);

  // Award XP
  let totalXp = XP_REWARDS.QUIZ_COMPLETED;
  if (isPerfect) {
    totalXp += XP_REWARDS.QUIZ_PERFECT;
  } else if (isHighScore) {
    totalXp += XP_REWARDS.QUIZ_HIGH_SCORE;
  }

  await awardXP(
    supabase,
    studentId,
    totalXp,
    isPerfect ? "quiz_perfect" : "quiz_completed",
    String(quizId),
    `Quiz completed with ${scorePercent}% score`,
  );

  // Evaluate badges
  return evaluateBadges(supabase, studentId, {
    quizId,
    quizScore: scorePercent,
  });
}

// ============================================================================
// Stats Retrieval Functions
// ============================================================================

/**
 * Get gamification stats for a student
 */
export async function getGamificationStats(
  supabase: SupabaseClient,
  studentId: string,
): Promise<ProfileGamificationStats | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "xp, level, reading_streak, longest_streak, total_books_completed, total_pages_read, total_quizzes_completed, total_perfect_quizzes",
    )
    .eq("id", studentId)
    .single();

  if (error || !profile) {
    return null;
  }

  const xp = profile.xp ?? 0;

  return {
    xp,
    level: profile.level ?? 1,
    reading_streak: profile.reading_streak ?? 0,
    longest_streak: profile.longest_streak ?? 0,
    total_books_completed: profile.total_books_completed ?? 0,
    total_pages_read: profile.total_pages_read ?? 0,
    total_quizzes_completed: profile.total_quizzes_completed ?? 0,
    total_perfect_quizzes: profile.total_perfect_quizzes ?? 0,
    xp_to_next_level: xpToNextLevel(xp),
    xp_progress_percent: levelProgressPercent(xp),
  };
}

/**
 * Get earned badges for a student
 */
export interface StudentBadgeWithBadge extends StudentBadge {
  badge: Badge;
}

export async function getStudentBadges(
  supabase: SupabaseClient,
  studentId: string,
): Promise<StudentBadgeWithBadge[]> {
  const { data, error } = await supabase
    .from("student_badges")
    .select("*, badge:badges(*)")
    .eq("student_id", studentId)
    .order("earned_at", { ascending: false });

  if (error) {
    console.error("Failed to get student badges:", error);
    return [];
  }

  return (data ?? []) as StudentBadgeWithBadge[];
}

/**
 * Get all badges with progress for a student
 */
export async function getBadgesWithProgress(
  supabase: SupabaseClient,
  studentId: string,
): Promise<
  Array<{
    badge: Badge;
    earned: boolean;
    earnedAt: string | null;
    progress: number;
    currentValue: number;
    targetValue: number;
  }>
> {
  // Get all badges
  const { data: badges, error: badgesError } = await supabase
    .from("badges")
    .select("*")
    .eq("is_active", true)
    .order("display_order");

  if (badgesError || !badges) {
    return [];
  }

  // Get earned badges
  const { data: earnedBadges } = await supabase
    .from("student_badges")
    .select("badge_id, earned_at")
    .eq("student_id", studentId);

  const earnedMap = new Map(
    earnedBadges?.map((b) => [b.badge_id, b.earned_at]) ?? [],
  );

  // Get student stats
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "total_books_completed, total_pages_read, total_quizzes_completed, reading_streak",
    )
    .eq("id", studentId)
    .single();

  const stats = {
    booksCompleted: profile?.total_books_completed ?? 0,
    pagesRead: profile?.total_pages_read ?? 0,
    quizzesCompleted: profile?.total_quizzes_completed ?? 0,
    readingStreak: profile?.reading_streak ?? 0,
  };

  return badges.map((badge) => {
    const earned = earnedMap.has(badge.id);
    const earnedAt = earnedMap.get(badge.id) ?? null;
    const { currentValue, targetValue, progress } = calculateBadgeProgress(
      badge.criteria as BadgeCriteria,
      stats,
    );

    return {
      badge,
      earned,
      earnedAt,
      progress: earned ? 100 : progress,
      currentValue,
      targetValue,
    };
  });
}

/**
 * Calculate progress towards a badge
 */
function calculateBadgeProgress(
  criteria: BadgeCriteria,
  stats: {
    booksCompleted: number;
    pagesRead: number;
    quizzesCompleted: number;
    readingStreak: number;
  },
): { currentValue: number; targetValue: number; progress: number } {
  let currentValue = 0;
  let targetValue = 1;

  switch (criteria.type) {
    case "books_completed":
      currentValue = stats.booksCompleted;
      targetValue = criteria.count ?? 1;
      break;

    case "pages_read":
      currentValue = stats.pagesRead;
      targetValue = criteria.count ?? 1;
      break;

    case "quizzes_completed":
      currentValue = stats.quizzesCompleted;
      targetValue = criteria.count ?? 1;
      break;

    case "reading_streak":
      currentValue = stats.readingStreak;
      targetValue = criteria.days ?? 1;
      break;

    default:
      // For badges that can't show progress
      return { currentValue: 0, targetValue: 1, progress: 0 };
  }

  const progress = Math.min(
    Math.round((currentValue / targetValue) * 100),
    100,
  );

  return { currentValue, targetValue, progress };
}
