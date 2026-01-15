"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { onQuizCompleted } from "@/lib/gamification";
import { getCurrentUser } from "@/lib/auth/server";
import type { Badge } from "@/types/database";

export const submitQuizAttempt = async (input: {
  quizId: number;
  answers: number[];
  score: number;
  totalQuestions: number;
}): Promise<{
  success: boolean;
  newBadges: Badge[];
  xpAwarded: number;
  scorePercent: number;
}> => {
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    throw new Error("You must be signed in to submit a quiz.");
  }

  // Get user's profile ID
  console.log("[submitQuizAttempt] Auth user.userId:", user.userId);
  console.log("[submitQuizAttempt] Auth user.profileId:", user.profileId);

  const profileId = user.profileId;

  // Insert quiz attempt using PostgreSQL
  const insertResult = await query(
    `INSERT INTO quiz_attempts (quiz_id, student_id, answers, score)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.quizId, profileId, JSON.stringify(input.answers), input.score],
  );

  if (insertResult.rows.length === 0) {
    throw new Error("Failed to save quiz attempt.");
  }

  // Award XP and evaluate badges for quiz completion
  const totalQuestions = input.totalQuestions || input.answers.length;
  const result = await onQuizCompleted(
    user.userId,
    profileId,
    input.quizId,
    input.score,
    totalQuestions,
  );

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/badges");

  const scorePercent = Math.round((input.score / totalQuestions) * 100);

  return {
    success: true,
    newBadges: result.newBadges,
    xpAwarded: result.totalXpAwarded,
    scorePercent,
  };
};
