"use server";

import { queryWithContext } from "@/lib/db";
import { getWeeklyChallengeProgress } from "@/lib/weekly-challenges";
import { checkAndAwardChallengeXP } from "@/lib/weekly-challenge-tracking";
import { revalidatePath } from "next/cache";

export type WeeklyChallengeData = {
  id: string;
  title: string;
  description: string;
  goal: number;
  progress: number;
  xpReward: number;
  icon: string;
  isCompleted: boolean;
};

export async function getWeeklyChallenge(
  userId: string,
): Promise<{ success: boolean; data?: WeeklyChallengeData; error?: string }> {
  try {
    // 1. Get profile ID
    const profileResult = await queryWithContext(
      userId,
      `SELECT id FROM profiles WHERE user_id = $1`,
      [userId]
    );
    const profileId = profileResult.rows[0]?.id;

    if (!profileId) {
      return { success: false, error: "Profile not found" };
    }

    // 2. Get challenge progress
    const result = await getWeeklyChallengeProgress(userId, profileId);

    // Auto-check and award XP if challenge is completed
    if (result.isCompleted) {
      const awardResult = await checkAndAwardChallengeXP(userId, profileId);
      if (awardResult.awarded) {
        revalidatePath("/dashboard/student");
        revalidatePath("/dashboard");
      }
    }

    return {
      success: true,
      data: {
        id: result.challenge.id,
        title: result.challenge.title,
        description: result.challenge.description,
        goal: result.challenge.goal,
        progress: result.progress,
        xpReward: result.challenge.xpReward,
        icon: result.challenge.icon,
        isCompleted: result.isCompleted,
      },
    };
  } catch (error) {
    console.error("Error fetching weekly challenge:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
