"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  updateReadingStreak,
  awardXP,
  evaluateBadges,
  onBookCompleted,
  XP_REWARDS,
} from "@/lib/gamification";
import type { Badge } from "@/types/database";

// Track last page read to avoid duplicate XP awards
const lastPageReadCache = new Map<string, number>();

export const recordReadingProgress = async (input: {
  bookId: number;
  currentPage: number;
}): Promise<{
  success: boolean;
  streakUpdated?: boolean;
  currentStreak?: number;
  xpAwarded?: number;
}> => {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to save progress.");
  }

  const cacheKey = `${user.id}-${input.bookId}`;
  const lastPage = lastPageReadCache.get(cacheKey) ?? 0;

  console.log("📖 Recording progress:", {
    student_id: user.id,
    book_id: input.bookId,
    current_page: input.currentPage,
  });

  const { data, error } = await supabase
    .from("student_books")
    .upsert(
      {
        student_id: user.id,
        book_id: input.bookId,
        current_page: input.currentPage,
      },
      { onConflict: "student_id,book_id" },
    )
    .select();

  console.log("📖 Progress save result:", { data, error });

  if (error) {
    console.error("❌ Failed to save progress:", error);
    throw error;
  }

  let xpAwarded = 0;
  let streakResult = { currentStreak: 0, isNewStreak: false };

  // Award XP for new pages read (avoid duplicates)
  if (input.currentPage > lastPage) {
    const newPagesRead = input.currentPage - lastPage;

    // Update streak (once per day)
    try {
      streakResult = await updateReadingStreak(supabaseAdmin, user.id);
    } catch (err) {
      console.error("Failed to update streak:", err);
    }

    // Award page XP
    try {
      const pageXp = newPagesRead * XP_REWARDS.PAGE_READ;
      await awardXP(
        supabaseAdmin,
        user.id,
        pageXp,
        "page_read",
        `${input.bookId}-${input.currentPage}`,
        `Read ${newPagesRead} page(s)`,
      );
      xpAwarded += pageXp;

      // Update total pages read
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("total_pages_read")
        .eq("id", user.id)
        .single();

      await supabaseAdmin
        .from("profiles")
        .update({
          total_pages_read: (profile?.total_pages_read ?? 0) + newPagesRead,
        })
        .eq("id", user.id);
    } catch (err) {
      console.error("Failed to award page XP:", err);
    }

    // Evaluate page-based badges
    try {
      await evaluateBadges(supabaseAdmin, user.id, { bookId: input.bookId });
    } catch (err) {
      console.error("Failed to evaluate badges:", err);
    }

    lastPageReadCache.set(cacheKey, input.currentPage);
  }

  console.log("✅ Progress saved successfully");
  revalidatePath("/dashboard/student");
  revalidatePath(`/dashboard/student/read/${input.bookId}`);

  return {
    success: true,
    streakUpdated: streakResult.isNewStreak,
    currentStreak: streakResult.currentStreak,
    xpAwarded,
  };
};

export const evaluateAchievements = async (
  bookId?: number,
): Promise<{
  awarded: number;
  newBadges: Badge[];
  xpAwarded: number;
  leveledUp: boolean;
}> => {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to evaluate achievements.");
  }

  // Check if this is a book completion
  let isBookCompletion = false;
  if (bookId) {
    const { data: studentBook } = await supabase
      .from("student_books")
      .select("current_page, books(page_count)")
      .eq("student_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (studentBook) {
      const bookData =
        Array.isArray(studentBook.books) && studentBook.books.length > 0
          ? studentBook.books[0]
          : studentBook.books;
      const book = bookData as { page_count?: number } | null;
      const pageCount = book?.page_count ?? 0;
      const currentPage = studentBook.current_page ?? 0;
      isBookCompletion = pageCount > 0 && currentPage >= pageCount;
    }
  }

  let result = { newBadges: [] as Badge[], totalXpAwarded: 0 };

  // If book was completed, use the book completion handler
  if (isBookCompletion && bookId) {
    result = await onBookCompleted(supabaseAdmin, user.id, bookId);
  } else {
    // Otherwise, just evaluate badges
    result = await evaluateBadges(supabaseAdmin, user.id, { bookId });
  }

  // Check if leveled up
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("level, xp")
    .eq("id", user.id)
    .single();

  const currentLevel = profile?.level ?? 1;
  const previousXp = (profile?.xp ?? 0) - result.totalXpAwarded;
  const previousLevel = Math.min(
    Math.floor(Math.sqrt(previousXp / 50)) + 1,
    100,
  );
  const leveledUp = currentLevel > previousLevel;

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/badges");

  return {
    awarded: result.newBadges.length,
    newBadges: result.newBadges,
    xpAwarded: result.totalXpAwarded,
    leveledUp,
  };
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
