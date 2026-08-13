import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { onQuizCompleted } from "@/lib/gamification";

vi.mock("@/lib/auth/server", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
}));

vi.mock("@/lib/gamification", () => ({
  onQuizCompleted: vi.fn(),
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
  }) as unknown as Awaited<ReturnType<typeof query>>;

const storedQuiz = {
  questions: {
    questions: [
      { options: ["A", "B"], answerIndex: 0 },
      { options: ["C", "D", "E"], answerIndex: 2 },
    ],
  },
};

describe("submitQuizAttempt", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
      role: "STUDENT",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.mocked(onQuizCompleted).mockResolvedValue({
      newBadges: [],
      totalXpAwarded: 5,
    });
  });

  it("loads the stored quiz and calculates the score on the server", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(queryResult([storedQuiz]))
      .mockResolvedValueOnce(queryResult([{ id: "attempt-1" }]));
    const { submitQuizAttempt } = await import(
      "@/app/(dashboard)/dashboard/student/quiz/actions"
    );

    await expect(
      submitQuizAttempt({ quizId: 9, answers: [0, 1] }),
    ).resolves.toEqual({
      success: true,
      newBadges: [],
      xpAwarded: 5,
      scorePercent: 50,
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("SELECT questions"),
      [9],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO quiz_attempts"),
      [9, "profile-1", JSON.stringify([0, 1]), 1],
    );
    expect(onQuizCompleted).toHaveBeenCalledWith(
      "user-1",
      "profile-1",
      9,
      1,
      2,
    );
  });

  it("rejects incomplete answers without creating an attempt", async () => {
    vi.mocked(query).mockResolvedValueOnce(queryResult([storedQuiz]));
    const { submitQuizAttempt } = await import(
      "@/app/(dashboard)/dashboard/student/quiz/actions"
    );

    await expect(
      submitQuizAttempt({ quizId: 9, answers: [0] }),
    ).rejects.toThrow("Answer every question before submitting.");
    expect(query).toHaveBeenCalledTimes(1);
    expect(onQuizCompleted).not.toHaveBeenCalled();
  });

  it("rejects invalid option indexes without creating an attempt", async () => {
    vi.mocked(query).mockResolvedValueOnce(queryResult([storedQuiz]));
    const { submitQuizAttempt } = await import(
      "@/app/(dashboard)/dashboard/student/quiz/actions"
    );

    await expect(
      submitQuizAttempt({ quizId: 9, answers: [0, 99] }),
    ).rejects.toThrow("One or more quiz answers are invalid.");
    expect(query).toHaveBeenCalledTimes(1);
    expect(onQuizCompleted).not.toHaveBeenCalled();
  });

  it("does not accept a client-supplied score field", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce(queryResult([storedQuiz]))
      .mockResolvedValueOnce(queryResult([{ id: "attempt-1" }]));
    const { submitQuizAttempt } = await import(
      "@/app/(dashboard)/dashboard/student/quiz/actions"
    );

    await submitQuizAttempt({
      quizId: 9,
      answers: [1, 1],
      score: 999,
      totalQuestions: 1,
    } as Parameters<typeof submitQuizAttempt>[0]);

    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("INSERT INTO quiz_attempts"),
      [9, "profile-1", JSON.stringify([1, 1]), 0],
    );
    expect(onQuizCompleted).toHaveBeenCalledWith(
      "user-1",
      "profile-1",
      9,
      0,
      2,
    );
  });

  it("scores librarian previews without recording an attempt or awarding XP", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      profileId: "profile-1",
      role: "LIBRARIAN",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    vi.mocked(query).mockResolvedValueOnce(queryResult([storedQuiz]));
    const { submitQuizAttempt } = await import(
      "@/app/(dashboard)/dashboard/student/quiz/actions"
    );

    await expect(
      submitQuizAttempt({ quizId: 9, answers: [0, 2], preview: true }),
    ).resolves.toEqual({
      success: true,
      newBadges: [],
      xpAwarded: 0,
      scorePercent: 100,
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(onQuizCompleted).not.toHaveBeenCalled();
  });
});
