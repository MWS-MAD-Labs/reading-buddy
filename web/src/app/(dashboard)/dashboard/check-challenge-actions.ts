"use server";

import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { checkAndAwardChallengeXP } from "@/lib/weekly-challenge-tracking";
import { revalidatePath } from "next/cache";

/**
 * Check if user completed their weekly challenge and award XP
 * This should be called whenever the user's progress might have updated
 * (e.g., after reading pages, completing books/quizzes)
 */
export async function checkWeeklyChallengeCompletion() {
  const user = await getCurrentUser();

  if (!user || !user.userId) {
    return { success: false, error: "Not authenticated" };
  }

  // Get profile ID
  const profileResult = await query(
    `SELECT id FROM profiles WHERE user_id = $1`,
    [user.userId]
  );

  const profileId = profileResult.rows[0]?.id;

  if (!profileId) {
    return { success: false, error: "Profile not found" };
  }

  const result = await checkAndAwardChallengeXP(user.userId, profileId);

  if (result.awarded) {
    // Revalidate pages to show updated XP
    revalidatePath("/dashboard/student");
    revalidatePath("/dashboard");
  }

  return { success: true, ...result };
}
