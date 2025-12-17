"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { onQuizCompleted } from "@/lib/gamification";
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
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to submit a quiz.");
  }

  const { error } = await supabase.from("quiz_attempts").insert({
    quiz_id: input.quizId,
    student_id: user.id,
    answers: input.answers,
    score: input.score,
  });

  if (error) {
    throw error;
  }

  // Award XP and evaluate badges for quiz completion
  const totalQuestions = input.totalQuestions || input.answers.length;
  const result = await onQuizCompleted(
    user.id,
    user.id,
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
