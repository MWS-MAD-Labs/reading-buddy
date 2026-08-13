import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext, transactionWithContext } from "@/lib/db";
import type { PoolClient } from "pg";
import {
  awardXP,
  evaluateBadges,
  onBookCompleted,
  updateReadingStreak,
} from "@/lib/gamification";
import { createJournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";

vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  queryWithContext: vi.fn(),
  transactionWithContext: vi.fn(),
}));

vi.mock("@/lib/gamification", () => ({
  updateReadingStreak: vi.fn(),
  awardXP: vi.fn(),
  evaluateBadges: vi.fn(),
  onBookCompleted: vi.fn(),
  XP_REWARDS: {
    PAGE_READ: 1,
  },
}));

vi.mock("@/app/(dashboard)/dashboard/journal/journal-actions", () => ({
  createJournalEntry: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const queryResult = <TRow extends Record<string, unknown>>(rows: TRow[]) =>
  ({
    rows,
    rowCount: rows.length,
    command: "SELECT",
    oid: 0,
    fields: [],
  }) as unknown as Awaited<ReturnType<typeof queryWithContext>>;

const mockProgressTransaction = (
  previousPages: Array<number | null>,
  rewardHistory: Array<{ highest_page: number; rewarded_today: number }> = [],
  xpClaims: boolean[] = [],
  checkpoints: Array<{ quiz_id: number; page_number: number }> = [],
) => {
  const transactionQueries: Array<{ sql: string; params: unknown[] }> = [];
  let savedPage: number | null = previousPages[0] ?? null;

  vi.mocked(transactionWithContext).mockImplementation(
    async (_userId, callback) => {
      const previousPage = previousPages.shift() ?? savedPage;
      const client = {
        query: vi.fn(async (sql: string, params: unknown[] = []) => {
          transactionQueries.push({ sql, params });

          if (sql.includes("pg_advisory_xact_lock")) {
            return queryResult([]);
          }

          if (sql.includes("SELECT current_page")) {
            return queryResult(
              previousPage === null ? [] : [{ current_page: previousPage }],
            );
          }

          if (sql.includes("FROM quiz_checkpoints")) {
            const checkpoint = checkpoints.shift();
            return queryResult(checkpoint ? [checkpoint] : []);
          }

          if (sql.includes("INSERT INTO student_books")) {
            savedPage = params[2] as number;
            return queryResult([
              {
                current_page: savedPage,
                progress_percent: params[4] ?? null,
                is_new: previousPage === null,
              },
            ]);
          }

          if (sql.includes("AS highest_page")) {
            return queryResult([
              rewardHistory.shift() ?? {
                highest_page: previousPage ?? 0,
                rewarded_today: 0,
              },
            ]);
          }

          if (sql.includes("INSERT INTO xp_transactions")) {
            return queryResult(
              (xpClaims.shift() ?? true) ? [{ id: "xp-transaction-1" }] : [],
            );
          }

          return queryResult([]);
        }),
      } as unknown as PoolClient;

      return callback(client);
    },
  );

  return transactionQueries;
};

describe("recordReadingProgress", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
    } as Awaited<ReturnType<typeof getCurrentUser>>);

    vi.mocked(updateReadingStreak).mockResolvedValue({
      currentStreak: 1,
      longestStreak: 1,
      isNewStreak: false,
      streakBonusXp: 0,
    });
    vi.mocked(awardXP).mockResolvedValue({
      newXp: 1,
      newLevel: 1,
      leveledUp: false,
      xpAwarded: 1,
    });
    vi.mocked(evaluateBadges).mockResolvedValue({
      newBadges: [],
      totalXpAwarded: 0,
    });
    vi.mocked(onBookCompleted).mockResolvedValue({
      newBadges: [],
      totalXpAwarded: 0,
    });
    vi.mocked(createJournalEntry).mockResolvedValue({
      id: "journal-1",
      student_id: "profile-1",
      entry_type: "reading_session",
      content: "Read",
      book_id: 1,
      page_number: null,
      page_range_start: 1,
      page_range_end: 1,
      reading_duration_minutes: null,
      metadata: {},
      is_private: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  it("saves non-student digital progress without student gamification", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
      role: "TEACHER",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    const transactionQueries = mockProgressTransaction([10]);

    const { recordReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );
    const result = await recordReadingProgress({
      bookId: 42,
      currentPage: 12,
      progressPercent: 50,
    });

    expect(result).toEqual({
      success: true,
      streakUpdated: false,
      currentStreak: 0,
      xpAwarded: 0,
    });
    expect(
      transactionQueries.some(({ sql }) => sql.includes("INSERT INTO student_books")),
    ).toBe(true);
    expect(createJournalEntry).not.toHaveBeenCalled();
    expect(updateReadingStreak).not.toHaveBeenCalled();
    expect(awardXP).not.toHaveBeenCalled();
    expect(evaluateBadges).not.toHaveBeenCalled();
    expect(queryWithContext).not.toHaveBeenCalled();
  });

  it("writes digital position fields and source in one transaction", async () => {
    const transactionQueries = mockProgressTransaction([10]);
    vi.mocked(queryWithContext).mockResolvedValue(queryResult([]));

    const { recordReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await recordReadingProgress({
      bookId: 42,
      currentPage: 12,
      epubCfi: "epubcfi(/6/4)",
      progressPercent: 50,
    });

    expect(transactionWithContext).toHaveBeenCalledWith(
      "user-1",
      expect.any(Function),
    );
    const upsert = transactionQueries.find(({ sql }) =>
      sql.includes("INSERT INTO student_books"),
    );
    expect(upsert?.sql).toContain("progress_source");
    expect(upsert?.sql).toContain("$6::VARCHAR(30)");
    expect(upsert?.sql).toContain("last_manual_sync_at");
    expect(upsert?.params).toEqual([
      "profile-1",
      42,
      12,
      "epubcfi(/6/4)",
      50,
      "digital_reader",
    ]);
  });

  it("keeps optional epub fields nullable when only a page is provided", async () => {
    const transactionQueries = mockProgressTransaction([3]);

    const { recordReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await recordReadingProgress({
      bookId: 7,
      currentPage: 3,
    });

    const upsert = transactionQueries.find(({ sql }) =>
      sql.includes("INSERT INTO student_books"),
    );
    expect(upsert?.params).toEqual([
      "profile-1",
      7,
      3,
      null,
      null,
      "digital_reader",
    ]);
  });

  it("calculates digital activity from the previous page in PostgreSQL", async () => {
    mockProgressTransaction([8]);
    vi.mocked(queryWithContext).mockResolvedValue(queryResult([]));

    const { recordReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    const result = await recordReadingProgress({
      bookId: 5,
      currentPage: 11,
    });

    expect(awardXP).toHaveBeenCalledWith(
      "user-1",
      "profile-1",
      3,
      "page_read",
      "5-11",
      "Read 3 page(s)",
    );
    expect(queryWithContext).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining(
        "SET total_pages_read = COALESCE(total_pages_read, 0) + $1",
      ),
      [3, "profile-1"],
    );
    expect(result.xpAwarded).toBe(3);
  });

  it.each([
    { name: "same-page save", previousPage: 12, currentPage: 12 },
    { name: "backward save", previousPage: 12, currentPage: 9 },
  ])("does not process activity for a $name", async ({ previousPage, currentPage }) => {
    mockProgressTransaction([previousPage]);

    const { recordReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    const result = await recordReadingProgress({
      bookId: 9,
      currentPage,
    });

    expect(updateReadingStreak).not.toHaveBeenCalled();
    expect(awardXP).not.toHaveBeenCalled();
    expect(evaluateBadges).not.toHaveBeenCalled();
    expect(queryWithContext).not.toHaveBeenCalled();
    expect(result.xpAwarded).toBe(0);
  });

  it("serializes saves and awards only the database-backed page deltas", async () => {
    const transactionQueries = mockProgressTransaction([10, 12]);
    vi.mocked(queryWithContext).mockResolvedValue(queryResult([]));

    const { recordReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await recordReadingProgress({ bookId: 4, currentPage: 12 });
    await recordReadingProgress({ bookId: 4, currentPage: 15 });

    expect(awardXP).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "profile-1",
      2,
      "page_read",
      "4-12",
      "Read 2 page(s)",
    );
    expect(awardXP).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "profile-1",
      3,
      "page_read",
      "4-15",
      "Read 3 page(s)",
    );
    expect(
      transactionQueries.filter(({ sql }) =>
        sql.includes("pg_advisory_xact_lock"),
      ),
    ).toHaveLength(2);
    expect(queryWithContext).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining(
        "SET total_pages_read = COALESCE(total_pages_read, 0) + $1",
      ),
      [2, "profile-1"],
    );
    expect(queryWithContext).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining(
        "SET total_pages_read = COALESCE(total_pages_read, 0) + $1",
      ),
      [3, "profile-1"],
    );
  });
});

describe("updatePhysicalReadingProgress", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
  });

  it("allows non-student profiles to save progress without student rewards", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
      role: "TEACHER",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    const transactionQueries = mockProgressTransaction([20]);
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 1, page_count: 100 }]),
    );
    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await expect(
      updatePhysicalReadingProgress({ bookId: 1, currentPage: 30 }),
    ).resolves.toEqual({
      success: true,
      data: {
        previousPage: 20,
        currentPage: 30,
        totalPages: 100,
        progressPercent: 30,
        source: "manual_physical",
        changed: true,
        movedBackward: false,
        reachedFinalPage: false,
        isNewBook: false,
        rewardedPages: 0,
        xpAwarded: 0,
        rewardStatus: "not_applicable",
      },
    });
    expect(
      transactionQueries.some(({ sql }) => sql.includes("INSERT INTO student_books")),
    ).toBe(true);
    expect(
      transactionQueries.some(({ sql }) => sql.includes("INSERT INTO xp_transactions")),
    ).toBe(false);
    expect(
      transactionQueries.find(({ sql }) =>
        sql.includes("INSERT INTO reading_progress_events"),
      )?.params,
    ).toEqual([
      "profile-1",
      1,
      20,
      30,
      "manual_physical",
      10,
      0,
      0,
      "not_applicable",
    ]);
  });

  it("blocks at the earliest unanswered required checkpoint before saving", async () => {
    const transactionQueries = mockProgressTransaction(
      [5],
      [],
      [],
      [{ quiz_id: 10, page_number: 10 }],
    );
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 1, page_count: 100 }]),
    );
    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await expect(
      updatePhysicalReadingProgress({ bookId: 1, currentPage: 35 }),
    ).resolves.toEqual({
      success: false,
      code: "CHECKPOINT_REQUIRED",
      message:
        "Complete the required quiz at page 10 before updating your progress.",
      checkpoint: { quizId: 10, checkpointPage: 10 },
    });
    expect(
      transactionQueries.some(({ sql }) => sql.includes("INSERT INTO student_books")),
    ).toBe(false);
    const checkpointQuery = transactionQueries.find(({ sql }) =>
      sql.includes("FROM quiz_checkpoints"),
    );
    expect(checkpointQuery?.sql).toContain("ORDER BY qc.page_number ASC");
    expect(checkpointQuery?.params).toEqual([1, 35, "profile-1"]);
  });

  it("allows backward corrections without checkpoint enforcement", async () => {
    const transactionQueries = mockProgressTransaction(
      [40],
      [],
      [],
      [{ quiz_id: 10, page_number: 10 }],
    );
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 1, page_count: 100 }]),
    );
    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await expect(
      updatePhysicalReadingProgress({ bookId: 1, currentPage: 35 }),
    ).resolves.toMatchObject({
      success: true,
      data: { currentPage: 35, movedBackward: true },
    });
    expect(
      transactionQueries.some(({ sql }) => sql.includes("FROM quiz_checkpoints")),
    ).toBe(false);
  });

  it("validates the submitted page before querying the book", async () => {
    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await expect(
      updatePhysicalReadingProgress({ bookId: 1, currentPage: 0 }),
    ).resolves.toMatchObject({ success: false, code: "INVALID_PAGE" });
    await expect(
      updatePhysicalReadingProgress({ bookId: 1, currentPage: 2.5 }),
    ).resolves.toMatchObject({ success: false, code: "INVALID_PAGE" });
    expect(queryWithContext).not.toHaveBeenCalled();
  });

  it("rejects missing books and pages above the catalog page count", async () => {
    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    vi.mocked(queryWithContext).mockResolvedValueOnce(queryResult([]));
    await expect(
      updatePhysicalReadingProgress({ bookId: 404, currentPage: 1 }),
    ).resolves.toMatchObject({ success: false, code: "BOOK_NOT_FOUND" });

    vi.mocked(queryWithContext).mockResolvedValueOnce(
      queryResult([{ id: 2, page_count: 100 }]),
    );
    await expect(
      updatePhysicalReadingProgress({ bookId: 2, currentPage: 101 }),
    ).resolves.toMatchObject({
      success: false,
      code: "PAGE_EXCEEDS_BOOK",
    });
  });

  it("calculates percentage, clears EPUB position, and awards only event-backed manual XP", async () => {
    const transactionQueries = mockProgressTransaction([20]);
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 3, page_count: 80 }]),
    );

    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );
    const result = await updatePhysicalReadingProgress({
      bookId: 3,
      currentPage: 30,
    });

    expect(result).toEqual({
      success: true,
      data: {
        previousPage: 20,
        currentPage: 30,
        totalPages: 80,
        progressPercent: 37.5,
        source: "manual_physical",
        changed: true,
        movedBackward: false,
        reachedFinalPage: false,
        isNewBook: false,
        rewardedPages: 10,
        xpAwarded: 10,
        rewardStatus: "awarded",
      },
    });
    const upsert = transactionQueries.find(({ sql }) =>
      sql.includes("INSERT INTO student_books"),
    );
    expect(upsert?.params).toEqual([
      "profile-1",
      3,
      30,
      null,
      37.5,
      "manual_physical",
    ]);
    expect(upsert?.sql).toContain("THEN NULL");
    expect(awardXP).not.toHaveBeenCalled();
    expect(updateReadingStreak).not.toHaveBeenCalled();
    expect(evaluateBadges).not.toHaveBeenCalled();
    expect(
      transactionQueries.find(({ sql }) =>
        sql.includes("INSERT INTO reading_progress_events"),
      )?.params,
    ).toEqual([
      "profile-1",
      3,
      20,
      30,
      "manual_physical",
      10,
      10,
      10,
      "awarded",
    ]);
    expect(
      transactionQueries.some(({ sql }) =>
        sql.includes("INSERT INTO xp_transactions"),
      ),
    ).toBe(true);
  });

  it("caps manual rewards per UTC day", async () => {
    const transactionQueries = mockProgressTransaction(
      [10],
      [{ highest_page: 10, rewarded_today: 18 }],
    );
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 8, page_count: 100 }]),
    );

    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );
    const result = await updatePhysicalReadingProgress({
      bookId: 8,
      currentPage: 20,
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        rewardedPages: 2,
        xpAwarded: 2,
        rewardStatus: "daily_cap_reached",
      },
    });
    expect(
      transactionQueries.find(({ sql }) => sql.includes("UPDATE profiles"))?.sql,
    ).toContain("level = calculate_level(xp + $1)");
    expect(
      transactionQueries.find(({ sql }) =>
        sql.includes("INSERT INTO xp_transactions"),
      )?.params,
    ).toEqual([
      "profile-1",
      2,
      "manual-8-20",
      "Recorded 2 new physical-reading page(s)",
    ]);
  });

  it("does not update profile XP when the database idempotency claim conflicts", async () => {
    const transactionQueries = mockProgressTransaction(
      [10],
      [{ highest_page: 10, rewarded_today: 0 }],
      [false],
    );
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 10, page_count: 100 }]),
    );

    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );
    const result = await updatePhysicalReadingProgress({
      bookId: 10,
      currentPage: 20,
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        rewardedPages: 0,
        xpAwarded: 0,
        rewardStatus: "already_rewarded",
      },
    });
    expect(
      transactionQueries.some(({ sql }) => sql.includes("UPDATE profiles")),
    ).toBe(false);
    expect(
      transactionQueries.find(({ sql }) =>
        sql.includes("INSERT INTO reading_progress_events"),
      )?.params,
    ).toEqual([
      "profile-1",
      10,
      10,
      20,
      "manual_physical",
      10,
      0,
      0,
      "already_rewarded",
    ]);
  });

  it("preserves the high-water mark across a backward correction", async () => {
    const transactionQueries = mockProgressTransaction(
      [50, 20],
      [{ highest_page: 50, rewarded_today: 0 }],
    );
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 11, page_count: 100 }]),
    );

    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await updatePhysicalReadingProgress({ bookId: 11, currentPage: 20 });
    const result = await updatePhysicalReadingProgress({
      bookId: 11,
      currentPage: 40,
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        previousPage: 20,
        currentPage: 40,
        rewardedPages: 0,
        xpAwarded: 0,
        rewardStatus: "already_rewarded",
      },
    });
    expect(
      transactionQueries.find(({ sql }) => sql.includes("AS highest_page"))?.sql,
    ).toContain(
      "GREATEST(current_page, COALESCE(previous_page, current_page))",
    );
    expect(
      transactionQueries.some(({ sql }) =>
        sql.includes("INSERT INTO xp_transactions"),
      ),
    ).toBe(false);
  });

  it("does not reward pages below the historical high-water mark", async () => {
    const transactionQueries = mockProgressTransaction(
      [15],
      [{ highest_page: 30, rewarded_today: 0 }],
    );
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 9, page_count: 100 }]),
    );

    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );
    const result = await updatePhysicalReadingProgress({
      bookId: 9,
      currentPage: 25,
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        rewardedPages: 0,
        xpAwarded: 0,
        rewardStatus: "already_rewarded",
      },
    });
    expect(
      transactionQueries.some(({ sql }) =>
        sql.includes("INSERT INTO xp_transactions"),
      ),
    ).toBe(false);
  });

  it("stores null percentage when the page count is unknown", async () => {
    const transactionQueries = mockProgressTransaction([null]);
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 4, page_count: null }]),
    );

    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );
    const result = await updatePhysicalReadingProgress({
      bookId: 4,
      currentPage: 12,
    });

    expect(result).toMatchObject({
      success: true,
      data: { progressPercent: null, isNewBook: true },
    });
    const upsert = transactionQueries.find(({ sql }) =>
      sql.includes("INSERT INTO student_books"),
    );
    expect(upsert?.params[4]).toBeNull();
  });

  it("treats an identical page as a no-op without writing timestamps", async () => {
    const transactionQueries = mockProgressTransaction([25]);
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 5, page_count: 100 }]),
    );

    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );
    const result = await updatePhysicalReadingProgress({
      bookId: 5,
      currentPage: 25,
    });

    expect(result).toMatchObject({
      success: true,
      data: { changed: false, currentPage: 25 },
    });
    expect(
      transactionQueries.some(({ sql }) =>
        sql.includes("INSERT INTO student_books"),
      ),
    ).toBe(false);
  });

  it("allows backward corrections without changing historical statistics", async () => {
    mockProgressTransaction([40]);
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ id: 6, page_count: 120 }]),
    );

    const { updatePhysicalReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );
    const result = await updatePhysicalReadingProgress({
      bookId: 6,
      currentPage: 35,
    });

    expect(result).toMatchObject({
      success: true,
      data: { movedBackward: true, currentPage: 35 },
    });
    expect(queryWithContext).toHaveBeenCalledTimes(1);
    expect(awardXP).not.toHaveBeenCalled();
    expect(updateReadingStreak).not.toHaveBeenCalled();
  });
});

describe("getPendingCheckpointForPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
  });

  it("queries for the earliest checkpoint without a completed attempt", async () => {
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ quiz_id: 12, page_number: 10 }]),
    );
    const { getPendingCheckpointForPage } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await expect(
      getPendingCheckpointForPage({ bookId: 3, currentPage: 65 }),
    ).resolves.toEqual({
      checkpointRequired: true,
      quizId: 12,
      checkpointPage: 10,
    });

    expect(queryWithContext).toHaveBeenCalledWith(
      "user-1",
      expect.stringContaining("NOT EXISTS"),
      [3, 65, "profile-1"],
    );
    expect(queryWithContext).toHaveBeenCalledTimes(1);
    expect(vi.mocked(queryWithContext).mock.calls[0]?.[1]).toContain(
      "ORDER BY qc.page_number ASC",
    );
  });
});

describe("markBookAsCompleted", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.mocked(onBookCompleted).mockResolvedValue({
      newBadges: [],
      totalXpAwarded: 25,
    });
    vi.mocked(createJournalEntry).mockResolvedValue({
      id: "journal-1",
    } as Awaited<ReturnType<typeof createJournalEntry>>);
    vi.mocked(queryWithContext).mockResolvedValue(
      queryResult([{ level: 2, xp: 75 }]),
    );
  });

  const mockCompletionTransaction = (completed: boolean) => {
    const transactionQueries: Array<{ sql: string; params: unknown[] }> = [];
    vi.mocked(transactionWithContext).mockImplementation(
      async (_userId, callback) => {
        const client = {
          query: vi.fn(async (sql: string, params: unknown[] = []) => {
            transactionQueries.push({ sql, params });
            if (sql.includes("pg_advisory_xact_lock")) return queryResult([]);
            if (sql.includes("SELECT page_count, title")) {
              return queryResult([{ page_count: 100, title: "Test Book" }]);
            }
            if (sql.includes("SELECT completed")) {
              return queryResult([{ completed }]);
            }
            return queryResult([]);
          }),
        } as unknown as PoolClient;
        return callback(client);
      },
    );
    return transactionQueries;
  };

  it("awards completion side effects only when the book becomes completed", async () => {
    const transactionQueries = mockCompletionTransaction(false);
    const { markBookAsCompleted } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await expect(markBookAsCompleted({ bookId: 7 })).resolves.toMatchObject({
      success: true,
      xpAwarded: 25,
    });

    expect(
      transactionQueries.some(({ sql }) =>
        sql.includes("INSERT INTO student_books"),
      ),
    ).toBe(true);
    expect(createJournalEntry).toHaveBeenCalledTimes(1);
    expect(onBookCompleted).toHaveBeenCalledWith("user-1", "profile-1", 7);
  });

  it("is idempotent when the book was already completed", async () => {
    const transactionQueries = mockCompletionTransaction(true);
    const { markBookAsCompleted } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await expect(markBookAsCompleted({ bookId: 7 })).resolves.toMatchObject({
      success: true,
      xpAwarded: 0,
      newBadges: [],
    });

    expect(
      transactionQueries.some(({ sql }) =>
        sql.includes("INSERT INTO student_books"),
      ),
    ).toBe(false);
    expect(createJournalEntry).not.toHaveBeenCalled();
    expect(onBookCompleted).not.toHaveBeenCalled();
  });
});
