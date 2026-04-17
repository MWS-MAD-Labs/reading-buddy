"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import {
  updateReadingStreak,
  awardXP,
  evaluateBadges,
  onBookCompleted,
  XP_REWARDS,
} from "@/lib/gamification";
import { createJournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import type { Badge } from "@/types/database";

// Track last page read to avoid duplicate XP awards
const lastPageReadCache = new Map<string, number>();

export const recordReadingProgress = async (input: {
  bookId: number;
  currentPage?: number;
  epubCfi?: string | null;
  progressPercent?: number | null;
}): Promise<{
  success: boolean;
  streakUpdated?: boolean;
  currentStreak?: number;
  xpAwarded?: number;
}> => {
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    throw new Error("You must be signed in to save progress.");
  }

  const cacheKey = `${user.profileId}-${input.bookId}`;
  const lastPage = lastPageReadCache.get(cacheKey) ?? 0;

  console.log("📖 Recording progress:", {
    student_id: user.profileId,
    book_id: input.bookId,
    current_page: input.currentPage,
    epub_cfi: input.epubCfi,
    progress_percent: input.progressPercent,
  });

  try {
    const resolvedPage =
      typeof input.currentPage === "number" && input.currentPage > 0
        ? input.currentPage
        : 1;

    const result = await queryWithContext(
      user.userId,
      `INSERT INTO student_books (
         student_id,
         book_id,
         current_page,
         epub_cfi,
         progress_percent
       )
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (student_id, book_id)
       DO UPDATE SET
         current_page = COALESCE($3, student_books.current_page),
         epub_cfi = COALESCE($4, student_books.epub_cfi),
         progress_percent = COALESCE($5, student_books.progress_percent),
         updated_at = NOW()
       RETURNING *, (xmax = 0) AS is_new`,
      [
        user.profileId,
        input.bookId,
        resolvedPage,
        input.epubCfi ?? null,
        input.progressPercent ?? null,
      ],
    );

    const isNew = result.rows[0]?.is_new;

    if (isNew) {
      // Log started_book
      try {
        await createJournalEntry({
          entryType: "started_book",
          bookId: input.bookId,
          content: "Started reading this book! 📚",
        });
      } catch (err) {
        console.error("Failed to log started_book:", err);
      }
    }
  } catch (error) {
    console.error("❌ Failed to save progress:", error);
    throw error;
  }

  let xpAwarded = 0;
  let streakResult = { currentStreak: 0, isNewStreak: false };

  // Award XP for new pages read (avoid duplicates)
  if ((input.currentPage ?? 0) > lastPage) {
    const newPagesRead = (input.currentPage ?? 0) - lastPage;

    // Log reading session periodically (every 5 pages or first page read)
    if (lastPage === 0 || (input.currentPage ?? 0) % 5 === 0) {
      try {
        await createJournalEntry({
          entryType: "reading_session",
          bookId: input.bookId,
          pageRangeStart: lastPage === 0 ? 1 : lastPage,
          pageRangeEnd: input.currentPage ?? 0,
          content: `Read up to page ${input.currentPage ?? 0} 📖`,
        });
      } catch (err) {
        console.error("Failed to log reading_session:", err);
      }
    }

    // Update streak (once per day)
    try {
      streakResult = await updateReadingStreak(user.userId, user.profileId);
    } catch (err) {
      console.error("Failed to update streak:", err);
    }

    // Award page XP
    try {
      const pageXp = newPagesRead * XP_REWARDS.PAGE_READ;
      await awardXP(
        user.userId,
        user.profileId,
        pageXp,
        "page_read",
        `${input.bookId}-${input.currentPage ?? 0}`,
        `Read ${newPagesRead} page(s)`,
      );
      xpAwarded += pageXp;

      // Update total pages read
      const profileResult = await queryWithContext(
        user.userId,
        `SELECT total_pages_read FROM profiles WHERE id = $1`,
        [user.profileId],
      );
      const profile = profileResult.rows[0];

      await queryWithContext(
        user.userId,
        `UPDATE profiles SET total_pages_read = $1 WHERE id = $2`,
        [(profile?.total_pages_read ?? 0) + newPagesRead, user.profileId],
      );
    } catch (err) {
      console.error("Failed to award page XP:", err);
    }

    // Evaluate page-based badges
    try {
      await evaluateBadges(user.userId, user.profileId, {
        bookId: input.bookId,
      });
    } catch (err) {
      console.error("Failed to evaluate badges:", err);
    }

    lastPageReadCache.set(cacheKey, input.currentPage ?? 0);
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
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    throw new Error("You must be signed in to evaluate achievements.");
  }

  // Check if this is a book completion
  let isBookCompletion = false;
  if (bookId) {
    const studentBookResult = await queryWithContext(
      user.userId,
      `SELECT sb.current_page, b.page_count
       FROM student_books sb
       JOIN books b ON sb.book_id = b.id
       WHERE sb.student_id = $1 AND sb.book_id = $2`,
      [user.profileId, bookId],
    );

    if (studentBookResult.rows.length > 0) {
      const studentBook = studentBookResult.rows[0];
      const pageCount = studentBook.page_count ?? 0;
      const currentPage = studentBook.current_page ?? 0;
      isBookCompletion = pageCount > 0 && currentPage >= pageCount;
    }
  }

  let result = { newBadges: [] as Badge[], totalXpAwarded: 0 };

  // If book was completed, use the book completion handler
  if (isBookCompletion && bookId) {
    result = await onBookCompleted(user.userId, user.profileId, bookId);
  } else {
    // Otherwise, just evaluate badges
    result = await evaluateBadges(user.userId, user.profileId, { bookId });
  }

  // Check if leveled up
  const profileResult = await queryWithContext(
    user.userId,
    `SELECT level, xp FROM profiles WHERE id = $1`,
    [user.profileId],
  );
  const profile = profileResult.rows[0];

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
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    throw new Error("You must be signed in to check checkpoints.");
  }

  // Find the latest required checkpoint at or before the current page
  // Note: Simplified query that doesn't depend on class_quiz_assignments table
  // TODO: Add class-based filtering once that table is available
  const checkpointResult = await queryWithContext(
    user.userId,
    `SELECT qc.id, qc.page_number, qc.quiz_id, qc.is_required
     FROM quiz_checkpoints qc
     WHERE qc.book_id = $1
       AND qc.is_required = true
       AND qc.quiz_id IS NOT NULL
       AND qc.page_number <= $2
     ORDER BY qc.page_number DESC
     LIMIT 1`,
    [input.bookId, input.currentPage],
  );

  if (checkpointResult.rows.length === 0) {
    return { checkpointRequired: false as const };
  }

  const checkpoint = checkpointResult.rows[0] as {
    quiz_id: number | null;
    page_number: number;
  };

  if (!checkpoint.quiz_id) {
    return { checkpointRequired: false as const };
  }

  // Check if the student has already completed this checkpoint quiz
  const attemptResult = await queryWithContext(
    user.userId,
    `SELECT id, score
     FROM quiz_attempts
     WHERE quiz_id = $1 AND student_id = $2
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [checkpoint.quiz_id, user.profileId],
  );

  const attempt = attemptResult.rows[0];
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

export const markBookAsCompleted = async (input: {
  bookId: number;
}): Promise<{
  success: boolean;
  newBadges: Badge[];
  xpAwarded: number;
  leveledUp: boolean;
  newLevel?: number;
}> => {
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    throw new Error("You must be signed in to mark a book as completed.");
  }

  // Get the book's page count
  const bookResult = await queryWithContext(
    user.userId,
    `SELECT page_count FROM books WHERE id = $1`,
    [input.bookId],
  );

  if (bookResult.rows.length === 0) {
    throw new Error("Book not found.");
  }

  const book = bookResult.rows[0];

  // Update student_books to mark as completed
  try {
    await queryWithContext(
      user.userId,
      `INSERT INTO student_books (student_id, book_id, current_page, completed, completed_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (student_id, book_id)
       DO UPDATE SET
         current_page = $3,
         completed = true,
         completed_at = NOW(),
         updated_at = NOW()`,
      [user.profileId, input.bookId, book.page_count ?? 1],
    );
  } catch (error) {
    console.error("Failed to mark book as completed:", error);
    throw new Error("Failed to mark book as completed.");
  }

  // Log to journal
  try {
    const bookData = bookResult.rows[0];
    await createJournalEntry({
      entryType: "finished_book",
      bookId: input.bookId,
      content: `Finished reading ${bookData.title || "this book"}! 🏁`,
      metadata: {
        completed_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Failed to log finished_book to journal:", err);
  }

  // Trigger book completion rewards
  const result = await onBookCompleted(
    user.userId,
    user.profileId,
    input.bookId,
  );

  // Get updated profile for level info
  const profileResult = await queryWithContext(
    user.userId,
    `SELECT level, xp FROM profiles WHERE id = $1`,
    [user.profileId],
  );
  const profile = profileResult.rows[0];

  const currentLevel = profile?.level ?? 1;
  const previousXp = (profile?.xp ?? 0) - result.totalXpAwarded;
  const previousLevel = Math.min(
    Math.floor(Math.sqrt(previousXp / 50)) + 1,
    100,
  );
  const leveledUp = currentLevel > previousLevel;

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/badges");
  revalidatePath(`/dashboard/student/read/${input.bookId}`);

  return {
    success: true,
    newBadges: result.newBadges,
    xpAwarded: result.totalXpAwarded,
    leveledUp,
    newLevel: leveledUp ? currentLevel : undefined,
  };
};

export const updateBookTotalPages = async (
  bookId: number,
  totalPages: number,
) => {
  const user = await getCurrentUser();

  if (!user || !user.userId) {
    throw new Error("You must be signed in to update book metadata.");
  }

  // Verify the book exists and check current page count
  const bookResult = await queryWithContext(
    user.userId,
    `SELECT page_count, file_format FROM books WHERE id = $1`,
    [bookId],
  );

  if (bookResult.rows.length === 0) {
    throw new Error("Book not found.");
  }

  const { page_count: currentCount, file_format: fileFormat } =
    bookResult.rows[0];

  if (fileFormat === "epub") {
    if (!currentCount || currentCount <= 1) {
      console.log(
        `📚 Saving canonical EPUB page count for book ${bookId}: ${totalPages}`,
      );
      await queryWithContext(
        user.userId,
        `UPDATE books SET page_count = $1 WHERE id = $2`,
        [totalPages, bookId],
      );
    }
    return;
  }

  // Only update if the new count is significantly different (e.g., > 10% difference)
  // or if the current count is 1 or null.
  // This prevents minor fluctuations based on screen size/parsing variations if any.
  // For EPUBs, the reader calculates pages based on content, which is more accurate for the reader view.
  if (
    !currentCount ||
    currentCount <= 1 ||
    Math.abs(currentCount - totalPages) > 5
  ) {
    console.log(
      `📚 Updating book ${bookId} page count: ${currentCount} -> ${totalPages}`,
    );
    await queryWithContext(
      user.userId,
      `UPDATE books SET page_count = $1 WHERE id = $2`,
      [totalPages, bookId],
    );
  }

  return { success: true };
};
