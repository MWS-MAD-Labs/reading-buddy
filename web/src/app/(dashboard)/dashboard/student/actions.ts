"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext, transactionWithContext } from "@/lib/db";
import {
  updateReadingStreak,
  awardXP,
  evaluateBadges,
  onBookCompleted,
  XP_REWARDS,
} from "@/lib/gamification";
import { createJournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import type {
  Badge,
  ReadingProgressRewardStatus,
} from "@/types/database";

export type ReadingProgressSource = "digital_reader" | "manual_physical";

type AuthenticatedUser = {
  userId: string;
  profileId: string;
  canEarnReadingRewards: boolean;
};

type SaveReadingPositionInput = {
  bookId: number;
  currentPage: number;
  epubCfi?: string | null;
  progressPercent?: number | null;
  source: ReadingProgressSource;
  totalPages?: number | null;
};

export type SaveReadingPositionResult = {
  previousPage: number | null;
  currentPage: number;
  totalPages: number | null;
  progressPercent: number | null;
  source: ReadingProgressSource;
  changed: boolean;
  movedBackward: boolean;
  reachedFinalPage: boolean;
  isNewBook: boolean;
  rewardedPages: number;
  xpAwarded: number;
  rewardStatus: ReadingProgressRewardStatus;
};

export type ManualProgressErrorCode =
  | "UNAUTHENTICATED"
  | "BOOK_NOT_FOUND"
  | "INVALID_PAGE"
  | "PAGE_EXCEEDS_BOOK"
  | "SAVE_FAILED";

export type ManualProgressResult =
  | { success: true; data: SaveReadingPositionResult }
  | {
      success: false;
      code: ManualProgressErrorCode;
      message: string;
    };

type DigitalActivityResult = {
  streakUpdated: boolean;
  currentStreak: number;
  xpAwarded: number;
};

const MANUAL_REWARD_DAILY_PAGE_CAP = 20;

async function saveReadingPosition(
  user: AuthenticatedUser,
  input: SaveReadingPositionInput,
): Promise<SaveReadingPositionResult> {
  return transactionWithContext(user.userId, async (client) => {
    // Serialize saves for one student/book pair so concurrent requests cannot
    // calculate the same page delta and duplicate activity side effects.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1), $2)",
      [user.profileId, input.bookId],
    );

    const previousResult = await client.query<{
      current_page: number;
      progress_percent: string | number | null;
      progress_source: ReadingProgressSource;
    }>(
      `SELECT current_page, progress_percent, progress_source
       FROM student_books
       WHERE student_id = $1 AND book_id = $2
       FOR UPDATE`,
      [user.profileId, input.bookId],
    );
    const previous = previousResult.rows[0];
    const previousPage = previous?.current_page ?? null;

    if (
      input.source === "manual_physical" &&
      previousPage === input.currentPage
    ) {
      return {
        previousPage,
        currentPage: previousPage,
        totalPages: input.totalPages ?? null,
        progressPercent:
          previous?.progress_percent === null ||
          previous?.progress_percent === undefined
            ? null
            : Number(previous.progress_percent),
        source: previous?.progress_source ?? input.source,
        changed: false,
        movedBackward: false,
        reachedFinalPage:
          input.totalPages !== null &&
          input.totalPages !== undefined &&
          previousPage === input.totalPages,
        isNewBook: false,
        rewardedPages: 0,
        xpAwarded: 0,
        rewardStatus: "not_applicable",
      };
    }

    const savedResult = await client.query<{
      current_page: number;
      progress_percent: string | number | null;
      is_new: boolean;
    }>(
      `INSERT INTO student_books (
         student_id,
         book_id,
         current_page,
         epub_cfi,
         progress_percent,
         progress_source,
         last_manual_sync_at
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         $6::VARCHAR(30),
         CASE WHEN $6::VARCHAR(30) = 'manual_physical' THEN NOW() ELSE NULL END
       )
       ON CONFLICT (student_id, book_id)
       DO UPDATE SET
         current_page = EXCLUDED.current_page,
         epub_cfi = CASE
           WHEN EXCLUDED.progress_source = 'manual_physical' THEN NULL
           ELSE COALESCE(EXCLUDED.epub_cfi, student_books.epub_cfi)
         END,
         progress_percent = CASE
           WHEN EXCLUDED.progress_source = 'manual_physical'
             THEN EXCLUDED.progress_percent
           ELSE COALESCE(EXCLUDED.progress_percent, student_books.progress_percent)
         END,
         progress_source = EXCLUDED.progress_source,
         last_manual_sync_at = CASE
           WHEN EXCLUDED.progress_source = 'manual_physical' THEN NOW()
           ELSE student_books.last_manual_sync_at
         END,
         updated_at = NOW()
       RETURNING current_page, progress_percent, (xmax = 0) AS is_new`,
      [
        user.profileId,
        input.bookId,
        input.currentPage,
        input.epubCfi ?? null,
        input.progressPercent ?? null,
        input.source,
      ],
    );

    const saved = savedResult.rows[0];
    const progressPercent =
      saved?.progress_percent === null || saved?.progress_percent === undefined
        ? null
        : Number(saved.progress_percent);
    const pagesAdvanced = Math.max(
      0,
      input.currentPage - (previousPage ?? 0),
    );
    let rewardedPages = 0;
    let xpAwarded = 0;
    let rewardStatus: ReadingProgressRewardStatus = "not_applicable";

    if (
      user.canEarnReadingRewards &&
      input.source === "manual_physical" &&
      pagesAdvanced > 0
    ) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), -1)",
        [user.profileId],
      );

      const rewardHistoryResult = await client.query<{
        highest_page: number;
        rewarded_today: number;
      }>(
        `SELECT
           GREATEST(
             $3::INTEGER,
             COALESCE((
               SELECT MAX(
                 GREATEST(current_page, COALESCE(previous_page, current_page))
               )
               FROM reading_progress_events
               WHERE student_id = $1 AND book_id = $2
             ), 0)
           )::INTEGER AS highest_page,
           COALESCE((
             SELECT SUM(rewarded_pages)
             FROM reading_progress_events
             WHERE student_id = $1
               AND source = 'manual_physical'
               AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
               AND created_at < (date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day') AT TIME ZONE 'UTC'
           ), 0)::INTEGER AS rewarded_today`,
        [user.profileId, input.bookId, previousPage ?? 0],
      );
      const rewardHistory = rewardHistoryResult.rows[0];
      const highestPage = Number(rewardHistory?.highest_page ?? previousPage ?? 0);
      const newlyRewardablePages = Math.max(0, input.currentPage - highestPage);
      const remainingDailyPages = Math.max(
        0,
        MANUAL_REWARD_DAILY_PAGE_CAP -
          Number(rewardHistory?.rewarded_today ?? 0),
      );

      rewardedPages = Math.min(newlyRewardablePages, remainingDailyPages);
      xpAwarded = rewardedPages * XP_REWARDS.PAGE_READ;

      if (newlyRewardablePages === 0) {
        rewardStatus = "already_rewarded";
      } else if (remainingDailyPages === 0) {
        rewardStatus = "daily_cap_reached";
      } else if (rewardedPages < newlyRewardablePages) {
        rewardStatus = "daily_cap_reached";
      } else if (rewardedPages > 0) {
        rewardStatus = "awarded";
      } else {
        rewardStatus = "not_applicable";
      }

      // The XP audit row is the database-backed idempotency claim. Profile XP
      // changes only when that claim is inserted; later failures still roll the
      // entire transaction back.
      if (xpAwarded > 0) {
        const xpTransactionResult = await client.query<{ id: string }>(
          `INSERT INTO xp_transactions (
             student_id, amount, source, source_id, description
           )
           VALUES ($1, $2, 'manual_page_read', $3, $4)
           ON CONFLICT (student_id, source_id)
             WHERE source = 'manual_page_read'
           DO NOTHING
           RETURNING id`,
          [
            user.profileId,
            xpAwarded,
            `manual-${input.bookId}-${input.currentPage}`,
            `Recorded ${rewardedPages} new physical-reading page(s)`,
          ],
        );

        if (xpTransactionResult.rows.length > 0) {
          await client.query(
            `UPDATE profiles
             SET xp = xp + $1,
                 level = calculate_level(xp + $1),
                 updated_at = NOW()
             WHERE id = $2`,
            [xpAwarded, user.profileId],
          );
        } else {
          rewardedPages = 0;
          xpAwarded = 0;
          rewardStatus = "already_rewarded";
        }
      }
    }

    await client.query(
      `INSERT INTO reading_progress_events (
         student_id,
         book_id,
         previous_page,
         current_page,
         source,
         pages_advanced,
         rewarded_pages,
         xp_awarded,
         reward_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        user.profileId,
        input.bookId,
        previousPage,
        input.currentPage,
        input.source,
        pagesAdvanced,
        rewardedPages,
        xpAwarded,
        rewardStatus,
      ],
    );

    return {
      previousPage,
      currentPage: saved?.current_page ?? input.currentPage,
      totalPages: input.totalPages ?? null,
      progressPercent,
      source: input.source,
      changed: true,
      movedBackward:
        previousPage !== null && input.currentPage < previousPage,
      reachedFinalPage:
        input.totalPages !== null &&
        input.totalPages !== undefined &&
        input.currentPage === input.totalPages,
      isNewBook: saved?.is_new ?? previousPage === null,
      rewardedPages,
      xpAwarded,
      rewardStatus,
    };
  });
}

async function processDigitalReadingActivity(
  user: AuthenticatedUser,
  bookId: number,
  result: SaveReadingPositionResult,
): Promise<DigitalActivityResult> {
  if (!user.canEarnReadingRewards) {
    return {
      streakUpdated: false,
      currentStreak: 0,
      xpAwarded: 0,
    };
  }

  let xpAwarded = 0;
  let streakResult = { currentStreak: 0, isNewStreak: false };
  const pagesAdvanced = Math.max(
    0,
    result.currentPage - (result.previousPage ?? 0),
  );

  if (result.isNewBook) {
    try {
      await createJournalEntry({
        entryType: "started_book",
        bookId,
        content: "Started reading this book! 📚",
      });
    } catch (err) {
      console.error("Failed to log started_book:", err);
    }
  }

  if (pagesAdvanced === 0) {
    return {
      streakUpdated: false,
      currentStreak: 0,
      xpAwarded: 0,
    };
  }

  if (result.previousPage === null || result.currentPage % 5 === 0) {
    try {
      await createJournalEntry({
        entryType: "reading_session",
        bookId,
        pageRangeStart: result.previousPage ?? 1,
        pageRangeEnd: result.currentPage,
        content: `Read up to page ${result.currentPage} 📖`,
      });
    } catch (err) {
      console.error("Failed to log reading_session:", err);
    }
  }

  try {
    streakResult = await updateReadingStreak(user.userId, user.profileId);
  } catch (err) {
    console.error("Failed to update streak:", err);
  }

  try {
    const pageXp = pagesAdvanced * XP_REWARDS.PAGE_READ;
    await awardXP(
      user.userId,
      user.profileId,
      pageXp,
      "page_read",
      `${bookId}-${result.currentPage}`,
      `Read ${pagesAdvanced} page(s)`,
    );
    xpAwarded += pageXp;

    await queryWithContext(
      user.userId,
      `UPDATE profiles
       SET total_pages_read = COALESCE(total_pages_read, 0) + $1
       WHERE id = $2`,
      [pagesAdvanced, user.profileId],
    );
  } catch (err) {
    console.error("Failed to award page XP:", err);
  }

  try {
    await evaluateBadges(user.userId, user.profileId, { bookId });
  } catch (err) {
    console.error("Failed to evaluate badges:", err);
  }

  return {
    streakUpdated: streakResult.isNewStreak,
    currentStreak: streakResult.currentStreak,
    xpAwarded,
  };
}

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

  const authenticatedUser: AuthenticatedUser = {
    userId: user.userId,
    profileId: user.profileId,
    canEarnReadingRewards: !user.role || user.role === "STUDENT",
  };
  const resolvedPage =
    typeof input.currentPage === "number" && input.currentPage > 0
      ? input.currentPage
      : 1;

  console.log("📖 Recording progress:", {
    student_id: user.profileId,
    book_id: input.bookId,
    current_page: resolvedPage,
    epub_cfi: input.epubCfi,
    progress_percent: input.progressPercent,
    source: "digital_reader",
  });

  let savedPosition: SaveReadingPositionResult;
  try {
    savedPosition = await saveReadingPosition(authenticatedUser, {
      bookId: input.bookId,
      currentPage: resolvedPage,
      epubCfi: input.epubCfi,
      progressPercent: input.progressPercent,
      source: "digital_reader",
    });
  } catch (error) {
    console.error("❌ Failed to save progress:", error);
    throw error;
  }

  const activity = await processDigitalReadingActivity(
    authenticatedUser,
    input.bookId,
    savedPosition,
  );

  console.log("✅ Progress saved successfully");
  revalidatePath("/dashboard/student");
  revalidatePath(`/dashboard/student/read/${input.bookId}`);

  return {
    success: true,
    ...activity,
  };
};

export const updatePhysicalReadingProgress = async (input: {
  bookId: number;
  currentPage: number;
}): Promise<ManualProgressResult> => {
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    return {
      success: false,
      code: "UNAUTHENTICATED",
      message: "You must be signed in to update progress.",
    };
  }


  if (!Number.isInteger(input.bookId) || input.bookId < 1) {
    return {
      success: false,
      code: "BOOK_NOT_FOUND",
      message: "We could not find that book.",
    };
  }

  if (
    !Number.isFinite(input.currentPage) ||
    !Number.isInteger(input.currentPage) ||
    input.currentPage < 1
  ) {
    return {
      success: false,
      code: "INVALID_PAGE",
      message: "Enter a whole page number of 1 or greater.",
    };
  }

  let book: { id: number; page_count: number | null } | undefined;
  try {
    const bookResult = await queryWithContext<{
      id: number;
      page_count: number | null;
    }>(
      user.userId,
      `SELECT id, page_count
       FROM books
       WHERE id = $1`,
      [input.bookId],
    );
    book = bookResult.rows[0];
  } catch (error) {
    console.error("Failed to load book for physical progress:", error);
    return {
      success: false,
      code: "SAVE_FAILED",
      message: "We could not save your progress. Please try again.",
    };
  }

  if (!book) {
    return {
      success: false,
      code: "BOOK_NOT_FOUND",
      message: "We could not find that book.",
    };
  }

  const totalPages =
    book.page_count === null || book.page_count === undefined
      ? null
      : Number(book.page_count);

  if (totalPages !== null && input.currentPage > totalPages) {
    return {
      success: false,
      code: "PAGE_EXCEEDS_BOOK",
      message: `Enter a page between 1 and ${totalPages}.`,
    };
  }

  const progressPercent =
    totalPages === null
      ? null
      : Math.min(
          100,
          Number(((input.currentPage / totalPages) * 100).toFixed(2)),
        );

  try {
    const data = await saveReadingPosition(
      {
        userId: user.userId,
        profileId: user.profileId,
        canEarnReadingRewards: !user.role || user.role === "STUDENT",
      },
      {
        bookId: input.bookId,
        currentPage: input.currentPage,
        epubCfi: null,
        progressPercent,
        source: "manual_physical",
        totalPages,
      },
    );

    revalidatePath("/dashboard/student");
    revalidatePath(`/dashboard/student/read/${input.bookId}`);

    return { success: true, data };
  } catch (error) {
    console.error("Failed to update physical reading progress:", error);
    return {
      success: false,
      code: "SAVE_FAILED",
      message: "We could not save your progress. Please try again.",
    };
  }
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

  // Find the latest required checkpoint at or before the current page that
  // does not yet have a submitted attempt for this student.
  // TODO: Add class-based filtering once class quiz assignments are required.
  const checkpointResult = await queryWithContext(
    user.userId,
    `SELECT qc.id, qc.page_number, qc.quiz_id, qc.is_required
     FROM quiz_checkpoints qc
     WHERE qc.book_id = $1
       AND qc.is_required = true
       AND qc.quiz_id IS NOT NULL
       AND qc.page_number <= $2
       AND NOT EXISTS (
         SELECT 1
         FROM quiz_attempts qa
         WHERE qa.quiz_id = qc.quiz_id
           AND qa.student_id = $3
           AND qa.score IS NOT NULL
       )
     ORDER BY qc.page_number DESC
     LIMIT 1`,
    [input.bookId, input.currentPage, user.profileId],
  );

  if (checkpointResult.rows.length === 0) {
    return { checkpointRequired: false as const };
  }

  const checkpoint = checkpointResult.rows[0] as {
    quiz_id: number;
    page_number: number;
  };

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

  let book: { page_count: number | null; title: string | null };
  let newlyCompleted = false;

  try {
    const completion = await transactionWithContext(
      user.userId,
      async (client) => {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext($1), $2)",
          [user.profileId, input.bookId],
        );

        const bookResult = await client.query<{
          page_count: number | null;
          title: string | null;
        }>(`SELECT page_count, title FROM books WHERE id = $1`, [input.bookId]);
        const selectedBook = bookResult.rows[0];

        if (!selectedBook) {
          throw new Error("Book not found.");
        }

        const progressResult = await client.query<{ completed: boolean }>(
          `SELECT completed
           FROM student_books
           WHERE student_id = $1 AND book_id = $2
           FOR UPDATE`,
          [user.profileId, input.bookId],
        );
        const wasCompleted = progressResult.rows[0]?.completed === true;

        if (!wasCompleted) {
          await client.query(
            `INSERT INTO student_books (
               student_id,
               book_id,
               current_page,
               completed,
               completed_at
             )
             VALUES ($1, $2, $3, true, NOW())
             ON CONFLICT (student_id, book_id)
             DO UPDATE SET
               current_page = $3,
               completed = true,
               completed_at = NOW(),
               updated_at = NOW()`,
            [user.profileId, input.bookId, selectedBook.page_count ?? 1],
          );
        }

        return { book: selectedBook, newlyCompleted: !wasCompleted };
      },
    );
    book = completion.book;
    newlyCompleted = completion.newlyCompleted;
  } catch (error) {
    console.error("Failed to mark book as completed:", error);
    if (error instanceof Error && error.message === "Book not found.") {
      throw error;
    }
    throw new Error("Failed to mark book as completed.");
  }

  let completionRewards = { newBadges: [] as Badge[], totalXpAwarded: 0 };

  if (newlyCompleted) {
    try {
      await createJournalEntry({
        entryType: "finished_book",
        bookId: input.bookId,
        content: `Finished reading ${book.title || "this book"}! 🏁`,
        metadata: {
          completed_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error("Failed to log finished_book to journal:", err);
    }

    completionRewards = await onBookCompleted(
      user.userId,
      user.profileId,
      input.bookId,
    );
  }

  // Get updated profile for level info
  const profileResult = await queryWithContext(
    user.userId,
    `SELECT level, xp FROM profiles WHERE id = $1`,
    [user.profileId],
  );
  const profile = profileResult.rows[0];

  const currentLevel = profile?.level ?? 1;
  const xpAwarded = completionRewards.totalXpAwarded;
  const previousXp = (profile?.xp ?? 0) - xpAwarded;
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
    newBadges: completionRewards.newBadges,
    xpAwarded,
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
