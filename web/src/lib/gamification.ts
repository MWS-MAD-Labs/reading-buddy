/**
 * Gamification System (Server-Side)
 *
 * Handles XP awards, badge evaluation, streak tracking with database operations.
 * This is the core engine for the Reading Buddy gamification system.
 *
 * NOTE: This file uses database operations and can only be imported in Server Components/Actions.
 * For client-safe utilities, import from "@/lib/gamification-utils" instead.
 */

import { query, queryWithContext } from "@/lib/db";
import {
  XP_REWARDS,
  calculateLevel,
  xpForLevel,
  xpToNextLevel,
  levelProgressPercent,
  getLevelTitle,
} from "@/lib/gamification-utils";
import type {
  Badge,
  BadgeCriteria,
  StudentBadge,
  XPSource,
  ProfileGamificationStats,
} from "@/types/database";

// Re-export utils for convenience
export {
  XP_REWARDS,
  calculateLevel,
  xpForLevel,
  xpToNextLevel,
  levelProgressPercent,
  getLevelTitle,
};

// ============================================================================
// XP Award Functions (using database functions)
// ============================================================================

interface AwardXPResult {
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  xpAwarded: number;
}

/**
 * Award XP to a student and update their level
 * Uses the database function award_xp() defined in 04-functions.sql
 */
export async function awardXP(
  userId: string,
  studentId: string,
  amount: number,
  source: XPSource,
  sourceId?: string,
  description?: string,
): Promise<AwardXPResult> {
  // Use the database function for XP award
  const result = await queryWithContext(
    userId,
    `SELECT * FROM award_xp($1, $2, $3, $4, $5)`,
    [studentId, amount, source, sourceId || null, description || null],
  );

  const row = result.rows[0];

  return {
    newXp: row.new_xp,
    newLevel: row.new_level,
    leveledUp: row.level_up,
    xpAwarded: amount,
  };
}

// ============================================================================
// Streak Functions (using database functions)
// ============================================================================

interface UpdateStreakResult {
  currentStreak: number;
  longestStreak: number;
  isNewStreak: boolean;
  streakBonusXp: number;
}

/**
 * Update reading streak for a student
 * Uses the database function update_reading_streak() defined in 04-functions.sql
 */
export async function updateReadingStreak(
  userId: string,
  studentId: string,
): Promise<UpdateStreakResult> {
  // Use the database function for streak update
  const result = await queryWithContext(
    userId,
    `SELECT * FROM update_reading_streak($1)`,
    [studentId],
  );

  const row = result.rows[0];
  const currentStreak = row.current_streak;
  const isNewStreak = row.is_new_streak;

  let streakBonusXp = 0;

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

  // Award streak bonus XP if applicable
  if (streakBonusXp > 0) {
    await awardXP(
      userId,
      studentId,
      streakBonusXp,
      "streak_bonus",
      `streak-${currentStreak}`,
      `${currentStreak}-day reading streak bonus`,
    );
  }

  // Get longest streak from profile
  const profileResult = await queryWithContext(
    userId,
    `SELECT longest_streak FROM profiles WHERE id = $1`,
    [studentId],
  );

  return {
    currentStreak,
    longestStreak: profileResult.rows[0]?.longest_streak || currentStreak,
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
  userId: string,
  studentId: string,
  context?: {
    bookId?: number;
    quizId?: number;
    quizScore?: number;
  },
): Promise<EvaluateBadgesResult> {
  // Get student's current stats
  const profileResult = await queryWithContext(
    userId,
    `SELECT total_books_completed, total_pages_read, total_quizzes_completed,
            total_perfect_quizzes, reading_streak
     FROM profiles WHERE id = $1`,
    [studentId],
  );

  const profile = profileResult.rows[0];
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Get all active badges
  const badgesResult = await query(
    `SELECT * FROM badges WHERE is_active = true`,
  );
  const badges = badgesResult.rows;

  // Get student's earned badges
  const earnedResult = await queryWithContext(
    userId,
    `SELECT badge_id FROM student_badges WHERE student_id = $1`,
    [studentId],
  );

  const earnedBadgeIds = new Set(earnedResult.rows.map((b) => b.badge_id));

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
      try {
        await queryWithContext(
          userId,
          `INSERT INTO student_badges (student_id, badge_id, book_id, quiz_id)
           VALUES ($1, $2, $3, $4)`,
          [
            studentId,
            badge.id,
            context?.bookId || null,
            context?.quizId || null,
          ],
        );

        newBadges.push(badge as Badge);

        // Award XP for the badge
        if (badge.xp_reward > 0) {
          await awardXP(
            userId,
            studentId,
            badge.xp_reward,
            "badge_earned",
            badge.id,
            `Earned badge: ${badge.name}`,
          );
          totalXpAwarded += badge.xp_reward;
        }
      } catch (error) {
        console.error(`Failed to award badge ${badge.id}:`, error);
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
  userId: string,
  studentId: string,
  bookId: number,
  pageNumber: number,
): Promise<void> {
  // Update total pages read
  await queryWithContext(
    userId,
    `UPDATE profiles SET total_pages_read = COALESCE(total_pages_read, 0) + 1
     WHERE id = $1`,
    [studentId],
  );

  // Update streak (once per day)
  await updateReadingStreak(userId, studentId);

  // Award page XP
  await awardXP(
    userId,
    studentId,
    XP_REWARDS.PAGE_READ,
    "page_read",
    `${bookId}-${pageNumber}`,
    `Read page ${pageNumber}`,
  );

  // Evaluate page-based badges
  await evaluateBadges(userId, studentId, { bookId });
}

/**
 * Update student stats when they complete a book
 */
export async function onBookCompleted(
  userId: string,
  studentId: string,
  bookId: number,
): Promise<EvaluateBadgesResult> {
  // Update total books completed
  await queryWithContext(
    userId,
    `UPDATE profiles SET total_books_completed = COALESCE(total_books_completed, 0) + 1
     WHERE id = $1`,
    [studentId],
  );

  // Award book completion XP
  await awardXP(
    userId,
    studentId,
    XP_REWARDS.BOOK_COMPLETED,
    "book_completed",
    String(bookId),
    "Completed a book",
  );

  // Award book-specific completion badges
  const bookSpecificBadges = await awardBookSpecificBadges(
    userId,
    studentId,
    bookId,
  );

  // Evaluate general badges
  const generalBadges = await evaluateBadges(userId, studentId, { bookId });

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
  userId: string,
  studentId: string,
  bookId: number,
): Promise<EvaluateBadgesResult> {
  // Get book-specific badges for this book that the student hasn't earned
  const badgesResult = await query(
    `SELECT * FROM badges
     WHERE is_active = true
       AND book_id = $1
       AND badge_type = 'book_completion_specific'`,
    [bookId],
  );

  const badges = badgesResult.rows;
  if (!badges || badges.length === 0) {
    return { newBadges: [], totalXpAwarded: 0 };
  }

  // Get student's earned badges
  const earnedResult = await queryWithContext(
    userId,
    `SELECT badge_id FROM student_badges WHERE student_id = $1`,
    [studentId],
  );

  const earnedBadgeIds = new Set(earnedResult.rows.map((b) => b.badge_id));

  const newBadges: Badge[] = [];
  let totalXpAwarded = 0;

  for (const badge of badges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    // Award the badge
    try {
      await queryWithContext(
        userId,
        `INSERT INTO student_badges (student_id, badge_id, book_id)
         VALUES ($1, $2, $3)`,
        [studentId, badge.id, bookId],
      );

      newBadges.push(badge as Badge);

      // Award XP for the badge
      if (badge.xp_reward > 0) {
        await awardXP(
          userId,
          studentId,
          badge.xp_reward,
          "badge_earned",
          badge.id,
          `Earned badge: ${badge.name}`,
        );
        totalXpAwarded += badge.xp_reward;
      }
    } catch (error) {
      console.error(`Failed to award badge ${badge.id}:`, error);
    }
  }

  return { newBadges, totalXpAwarded };
}

/**
 * Update student stats when they complete a quiz
 */
export async function onQuizCompleted(
  userId: string,
  studentId: string,
  quizId: number,
  score: number,
  totalQuestions: number,
): Promise<EvaluateBadgesResult> {
  const scorePercent = Math.round((score / totalQuestions) * 100);
  const isPerfect = scorePercent === 100;
  const isHighScore = scorePercent >= 90;

  // Update quiz stats
  const updates: string[] = [
    "total_quizzes_completed = COALESCE(total_quizzes_completed, 0) + 1",
  ];

  if (isPerfect) {
    updates.push(
      "total_perfect_quizzes = COALESCE(total_perfect_quizzes, 0) + 1",
    );
  }

  await queryWithContext(
    userId,
    `UPDATE profiles SET ${updates.join(", ")} WHERE id = $1`,
    [studentId],
  );

  // Award XP
  let totalXp = XP_REWARDS.QUIZ_COMPLETED;
  if (isPerfect) {
    totalXp += XP_REWARDS.QUIZ_PERFECT;
  } else if (isHighScore) {
    totalXp += XP_REWARDS.QUIZ_HIGH_SCORE;
  }

  await awardXP(
    userId,
    studentId,
    totalXp,
    isPerfect ? "quiz_perfect" : "quiz_completed",
    String(quizId),
    `Quiz completed with ${scorePercent}% score`,
  );

  // Evaluate badges
  return evaluateBadges(userId, studentId, {
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
  userId: string,
  studentId: string,
): Promise<ProfileGamificationStats | null> {
  const result = await queryWithContext(
    userId,
    `SELECT xp, level, reading_streak, longest_streak,
            total_books_completed, total_pages_read,
            total_quizzes_completed, total_perfect_quizzes
     FROM profiles WHERE id = $1`,
    [studentId],
  );

  const profile = result.rows[0];
  if (!profile) {
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
  userId: string,
  studentId: string,
): Promise<StudentBadgeWithBadge[]> {
  const result = await queryWithContext(
    userId,
    `SELECT sb.*,
            b.id as badge_id, b.name, b.description, b.icon_url, b.xp_reward,
            b.badge_type, b.criteria, b.book_id as badge_book_id,
            b.is_active, b.display_order
     FROM student_badges sb
     JOIN badges b ON sb.badge_id = b.id
     WHERE sb.student_id = $1
     ORDER BY sb.earned_at DESC`,
    [studentId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    student_id: row.student_id,
    badge_id: row.badge_id,
    book_id: row.book_id,
    quiz_id: row.quiz_id,
    earned_at: row.earned_at,
    badge: {
      id: row.badge_id,
      name: row.name,
      description: row.description,
      icon_url: row.icon_url,
      xp_reward: row.xp_reward,
      badge_type: row.badge_type,
      criteria: row.criteria,
      book_id: row.badge_book_id,
      is_active: row.is_active,
      display_order: row.display_order,
    },
  })) as StudentBadgeWithBadge[];
}

/**
 * Get all badges with progress for a student
 */
export async function getBadgesWithProgress(
  userId: string,
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
  const badgesResult = await query(
    `SELECT * FROM badges WHERE is_active = true ORDER BY display_order`,
  );
  const badges = badgesResult.rows;

  // Get earned badges
  const earnedResult = await queryWithContext(
    userId,
    `SELECT badge_id, earned_at FROM student_badges WHERE student_id = $1`,
    [studentId],
  );

  const earnedMap = new Map(
    earnedResult.rows.map((b) => [b.badge_id, b.earned_at]),
  );

  // Get student stats
  const statsResult = await queryWithContext(
    userId,
    `SELECT total_books_completed, total_pages_read, total_quizzes_completed, reading_streak
     FROM profiles WHERE id = $1`,
    [studentId],
  );

  const profile = statsResult.rows[0];
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
      badge: badge as Badge,
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
