"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const recordReadingProgress = async (input: {
  bookId: number;
  currentPage: number;
}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to save progress.");
  }

  const { error } = await supabase.from("student_books").upsert(
    {
      student_id: user.id,
      book_id: input.bookId,
      current_page: input.currentPage,
    },
    { onConflict: "student_id,book_id" },
  );

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard/student");
};

export const evaluateAchievements = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to evaluate achievements.");
  }

  const { data: completions } = await supabase
    .from("student_books")
    .select("current_page, books(page_count)")
    .eq("student_id", user.id);

  const finishedCount =
    completions?.filter((entry) => {
      // Extract book data from array if it exists
      const bookData =
        Array.isArray(entry.books) && entry.books.length > 0
          ? entry.books[0]
          : entry.books;
      const book = bookData as { page_count?: number } | null;
      const pageCount = book?.page_count ?? 0;
      const current = entry.current_page ?? 0;
      return pageCount > 0 && current >= pageCount;
    }).length ?? 0;

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*");
  const { data: earned } = await supabase
    .from("student_achievements")
    .select("achievement_id")
    .eq("student_id", user.id);

  const earnedIds = new Set(
    (earned ?? []).map((record) => record.achievement_id),
  );

  const toAward =
    achievements?.filter((achievement) => {
      if (earnedIds.has(achievement.id)) {
        return false;
      }
      const criteria =
        (achievement.criteria as { type?: string; count?: number } | null) ??
        {};
      if (
        criteria.type === "books_read" &&
        typeof criteria.count === "number"
      ) {
        return finishedCount >= criteria.count;
      }
      return false;
    }) ?? [];

  if (!toAward.length) {
    return { awarded: 0 };
  }

  await supabase.from("student_achievements").insert(
    toAward.map((achievement) => ({
      student_id: user.id,
      achievement_id: achievement.id,
    })),
  );

  revalidatePath("/dashboard/student");
  return { awarded: toAward.length };
};

export const getPendingCheckpointForPage = async (input: {
  bookId: number;
  currentPage: number;
}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to check checkpoints.");
  }

  // Use admin client for checkpoint queries to avoid RLS recursion
  const supabaseAdmin = getSupabaseAdminClient();

  // Find the latest required checkpoint at or before the current page
  const { data: checkpoints, error: checkpointError } = await supabaseAdmin
    .from("quiz_checkpoints")
    .select("id, page_number, quiz_id, is_required")
    .eq("book_id", input.bookId)
    .eq("is_required", true)
    .not("quiz_id", "is", null)
    .lte("page_number", input.currentPage)
    .order("page_number", { ascending: false })
    .limit(1);

  if (checkpointError) {
    throw checkpointError;
  }

  if (!checkpoints || checkpoints.length === 0) {
    return { checkpointRequired: false as const };
  }

  const checkpoint = checkpoints[0] as {
    quiz_id: number | null;
    page_number: number;
  };

  if (!checkpoint.quiz_id) {
    return { checkpointRequired: false as const };
  }

  // Check if the student has already completed this checkpoint quiz
  const { data: attempt, error: attemptError } = await supabaseAdmin
    .from("quiz_attempts")
    .select("id, score")
    .eq("quiz_id", checkpoint.quiz_id)
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attemptError) {
    throw attemptError;
  }

  const completed = attempt && attempt.score !== null;

  if (completed) {
    return { checkpointRequired: false as const };
  }

  return {
    checkpointRequired: true as const,
    quizId: checkpoint.quiz_id,
    checkpointPage: checkpoint.page_number,
  };
};
