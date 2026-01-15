/**
 * Weekly Challenge Tracking System
 *
 * Handles checking and awarding XP for completed weekly challenges
 */

import { queryWithContext } from "@/lib/db";
import { getWeeklyChallengeProgress } from "./weekly-challenges";
import { awardXP } from "./gamification";

/**
 * Get the current week number and year
 */
function getWeekInfo(date: Date = new Date()): {
  weekNumber: number;
  year: number;
} {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return {
    weekNumber,
    year: d.getUTCFullYear(),
  };
}

/**
 * Check if a challenge has already been completed this week
 */
export async function hasCompletedChallengeThisWeek(
  authUserId: string,
  studentId: string,
  challengeId: string,
): Promise<boolean> {
  const { weekNumber, year } = getWeekInfo();

  const result = await queryWithContext(
    authUserId,
    `SELECT id FROM weekly_challenge_completions
     WHERE student_id = $1
       AND challenge_id = $2
       AND week_number = $3
       AND year = $4`,
    [studentId, challengeId, weekNumber, year],
  );

  return result.rows.length > 0;
}

/**
 * Check if user completed the challenge and award XP if they haven't received it yet
 * Returns true if XP was awarded, false if already awarded or not yet completed
 */
export async function checkAndAwardChallengeXP(
  authUserId: string,
  studentId: string,
): Promise<{ awarded: boolean; xpAmount?: number }> {
  try {
    // Get current challenge and progress
    const { challenge, isCompleted } = await getWeeklyChallengeProgress(
      authUserId,
      studentId,
    );

    if (!isCompleted) {
      return { awarded: false };
    }

    // Check if already awarded this week
    const alreadyCompleted = await hasCompletedChallengeThisWeek(
      authUserId,
      studentId,
      challenge.id,
    );

    if (alreadyCompleted) {
      return { awarded: false };
    }

    // Award XP
    const { weekNumber, year } = getWeekInfo();

    await awardXP(
      authUserId,
      studentId,
      challenge.xpReward,
      "challenge_completed",
      `weekly_challenge_${challenge.id}`,
      `Completed weekly challenge: ${challenge.title}`,
    );

    // Record completion
    await queryWithContext(
      authUserId,
      `INSERT INTO weekly_challenge_completions
       (student_id, challenge_id, week_number, year, xp_awarded)
       VALUES ($1, $2, $3, $4, $5)`,
      [studentId, challenge.id, weekNumber, year, challenge.xpReward],
    );

    return { awarded: true, xpAmount: challenge.xpReward };
  } catch (error) {
    console.error("Error checking/awarding challenge XP:", error);
    return { awarded: false };
  }
}

/**
 * Get all challenge completions for a user
 */
export async function getUserChallengeCompletions(
  authUserId: string,
  studentId: string,
  limit: number = 10,
) {
  try {
    const result = await queryWithContext(
      authUserId,
      `SELECT * FROM weekly_challenge_completions
       WHERE student_id = $1
       ORDER BY completed_at DESC
       LIMIT $2`,
      [studentId, limit],
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error fetching challenge completions:", error);
    return [];
  }
}

/**
 * Get total XP earned from challenges
 */
export async function getTotalChallengeXP(
  authUserId: string,
  studentId: string,
): Promise<number> {
  try {
    const result = await queryWithContext(
      authUserId,
      `SELECT SUM(xp_awarded) as total
       FROM weekly_challenge_completions
       WHERE student_id = $1`,
      [studentId],
    );

    return parseInt(result.rows[0]?.total || "0");
  } catch (error) {
    console.error("Error fetching total challenge XP:", error);
    return 0;
  }
}
