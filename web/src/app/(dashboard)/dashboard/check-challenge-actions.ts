"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkAndAwardChallengeXP } from "@/lib/weekly-challenge-tracking";
import { revalidatePath } from "next/cache";

/**
 * Check if user completed their weekly challenge and award XP
 * This should be called whenever the user's progress might have updated
 * (e.g., after reading pages, completing books/quizzes)
 */
export async function checkWeeklyChallengeCompletion() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const result = await checkAndAwardChallengeXP(supabaseAdmin, user.id);

  if (result.awarded) {
    // Revalidate pages to show updated XP
    revalidatePath("/dashboard/student");
    revalidatePath("/dashboard");
  }

  return { success: true, ...result };
}
