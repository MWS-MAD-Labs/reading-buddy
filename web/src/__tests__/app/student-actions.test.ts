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

const mockProgressTransaction = (previousPages: Array<number | null>) => {
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

  it("writes digital position fields and source in one transaction", async () => {
    const transactionQueries = mockProgressTransaction([10]);
    vi.mocked(queryWithContext).mockImplementation(async (_userId, sql) => {
      if (sql.includes("SELECT total_pages_read FROM profiles")) {
        return queryResult([{ total_pages_read: 20 }]);
      }
      return queryResult([]);
    });

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
    vi.mocked(queryWithContext).mockImplementation(async (_userId, sql) => {
      if (sql.includes("SELECT total_pages_read FROM profiles")) {
        return queryResult([{ total_pages_read: 30 }]);
      }
      return queryResult([]);
    });

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
      "UPDATE profiles SET total_pages_read = $1 WHERE id = $2",
      [33, "profile-1"],
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
    vi.mocked(queryWithContext).mockImplementation(async (_userId, sql) => {
      if (sql.includes("SELECT total_pages_read FROM profiles")) {
        return queryResult([{ total_pages_read: 0 }]);
      }
      return queryResult([]);
    });

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
  });
});
