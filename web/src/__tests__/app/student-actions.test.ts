import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
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

  it("dual-writes current page, epub cfi, and progress percent", async () => {
    vi.resetModules();

    vi.mocked(queryWithContext).mockImplementation(async (_userId, sql) => {
      if (sql.includes("INSERT INTO student_books")) {
        return queryResult([{ is_new: false }]);
      }

      if (sql.includes("SELECT total_pages_read FROM profiles")) {
        return queryResult([{ total_pages_read: 0 }]);
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

    const [userId, sql, params] = vi.mocked(queryWithContext).mock.calls[0];
    expect(userId).toBe("user-1");
    expect(sql).toContain("epub_cfi");
    expect(sql).toContain("progress_percent");
    expect(params).toEqual(["profile-1", 42, 12, "epubcfi(/6/4)", 50]);
  });

  it("keeps optional epub fields nullable when only a page is provided", async () => {
    vi.resetModules();

    vi.mocked(queryWithContext).mockResolvedValue({
      ...queryResult([{ is_new: false }]),
    });

    const { recordReadingProgress } = await import(
      "@/app/(dashboard)/dashboard/student/actions"
    );

    await recordReadingProgress({
      bookId: 7,
      currentPage: 3,
    });

    const params = vi.mocked(queryWithContext).mock.calls[0][2];
    expect(params).toEqual(["profile-1", 7, 3, null, null]);
  });
});
