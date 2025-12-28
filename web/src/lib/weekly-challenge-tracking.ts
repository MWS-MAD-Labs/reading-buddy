/**
 * Weekly Challenge Tracking System
 *
 * Handles checking and awarding XP for completed weekly challenges
 */

import { SupabaseClient } from "@supabase/supabase-js";
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
  supabase: SupabaseClient,
  userId: string,
  challengeId: string,
): Promise<boolean> {
  const { weekNumber, year } = getWeekInfo();

  const { data, error } = await supabase
    .from("weekly_challenge_completions")
    .select("id")
    .eq("student_id", userId)
    .eq("challenge_id", challengeId)
    .eq("week_number", weekNumber)
    .eq("year", year)
    .single();

  return !!data && !error;
}

/**
 * Check if user completed the challenge and award XP if they haven't received it yet
 * Returns true if XP was awarded, false if already awarded or not yet completed
 */
export async function checkAndAwardChallengeXP(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ awarded: boolean; xpAmount?: number }> {
  try {
    // Get current challenge and progress
    const { challenge, isCompleted } = await getWeeklyChallengeProgress(
      supabase,
      userId,
    );

    if (!isCompleted) {
      return { awarded: false };
    }

    // Check if already awarded this week
    const alreadyCompleted = await hasCompletedChallengeThisWeek(
      supabase,
      userId,
      challenge.id,
    );

    if (alreadyCompleted) {
      return { awarded: false };
    }

    // Award XP
    const { weekNumber, year } = getWeekInfo();

    await awardXP(
      userId,
      userId,
      challenge.xpReward,
      "challenge_completed",
      `weekly_challenge_${challenge.id}`,
      `Completed weekly challenge: ${challenge.title}`,
    );

    // Record completion
    await supabase.from("weekly_challenge_completions").insert({
      student_id: userId,
      challenge_id: challenge.id,
      week_number: weekNumber,
      year: year,
      xp_awarded: challenge.xpReward,
    });

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
  supabase: SupabaseClient,
  userId: string,
  limit: number = 10,
) {
  const { data, error } = await supabase
    .from("weekly_challenge_completions")
    .select("*")
    .eq("student_id", userId)
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching challenge completions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get total XP earned from challenges
 */
export async function getTotalChallengeXP(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("weekly_challenge_completions")
    .select("xp_awarded")
    .eq("student_id", userId);

  if (error) {
    console.error("Error fetching total challenge XP:", error);
    return 0;
  }

  return data?.reduce((sum, completion) => sum + completion.xp_awarded, 0) || 0;
}
