import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { publishQuiz } from "@/app/(dashboard)/dashboard/librarian/actions";
import { updatePhysicalReadingProgress } from "@/app/(dashboard)/dashboard/student/actions";
import { submitQuizAttempt } from "@/app/(dashboard)/dashboard/student/quiz/actions";
import { QuizPlayer } from "@/components/dashboard/QuizPlayer";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/app/(dashboard)/dashboard/student/quiz/actions", () => ({
  submitQuizAttempt: vi.fn(),
}));

vi.mock("@/app/(dashboard)/dashboard/student/actions", () => ({
  updatePhysicalReadingProgress: vi.fn(),
}));

vi.mock("@/app/(dashboard)/dashboard/librarian/actions", () => ({
  publishQuiz: vi.fn(),
}));

const quizData = {
  title: "Test quiz",
  questions: [
    {
      question: "Which answer is correct?",
      options: ["Correct", "Incorrect"],
      answerIndex: 0,
    },
  ],
};

const successfulProgressUpdate = {
  success: true as const,
  data: {
    previousPage: 5,
    currentPage: 35,
    totalPages: 100,
    progressPercent: 35,
    source: "manual_physical" as const,
    changed: true,
    movedBackward: false,
    reachedFinalPage: false,
    isNewBook: false,
    rewardedPages: 30,
    xpAwarded: 20,
    rewardStatus: "awarded" as const,
  },
};

const answerAndSubmit = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Correct/ }));
  await user.click(screen.getByRole("button", { name: /Submit My Answers/ }));
  await screen.findByText("Final Score");
  return user;
};

describe("QuizPlayer completion actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(submitQuizAttempt).mockResolvedValue({
      success: true,
      newBadges: [],
      xpAwarded: 5,
      scorePercent: 100,
    });
  });

  it("submits the original page update and returns to the student dashboard", async () => {
    vi.mocked(updatePhysicalReadingProgress).mockResolvedValue(
      successfulProgressUpdate,
    );
    render(
      <QuizPlayer
        quizId={9}
        quizData={quizData}
        bookId={1}
        targetPage={35}
        origin="progress-update"
      />,
    );

    const user = await answerAndSubmit();
    expect(submitQuizAttempt).toHaveBeenCalledWith({
      quizId: 9,
      answers: [0],
      preview: false,
    });

    await user.click(
      screen.getByRole("button", { name: "Confirm and update to page 35" }),
    );

    await waitFor(() =>
      expect(updatePhysicalReadingProgress).toHaveBeenCalledWith({
        bookId: 1,
        currentPage: 35,
      }),
    );
    expect(push).toHaveBeenCalledWith("/dashboard/student");
    expect(refresh).toHaveBeenCalled();
  });

  it("continues to the next required checkpoint before saving the page update", async () => {
    vi.mocked(updatePhysicalReadingProgress).mockResolvedValue({
      success: false,
      code: "CHECKPOINT_REQUIRED",
      message: "Complete the required quiz at page 20.",
      checkpoint: { quizId: 12, checkpointPage: 20 },
    });
    render(
      <QuizPlayer
        quizId={9}
        quizData={quizData}
        bookId={1}
        targetPage={35}
        origin="progress-update"
      />,
    );

    const user = await answerAndSubmit();
    await user.click(
      screen.getByRole("button", { name: "Confirm and update to page 35" }),
    );

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(
        "/dashboard/student/quiz/12?origin=progress-update&bookId=1&page=20&targetPage=35",
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a failed page update message without navigating", async () => {
    vi.mocked(updatePhysicalReadingProgress).mockResolvedValue({
      success: false,
      code: "INVALID_PAGE",
      message: "That page cannot be saved.",
    });
    render(
      <QuizPlayer
        quizId={9}
        quizData={quizData}
        bookId={1}
        targetPage={35}
        origin="progress-update"
      />,
    );

    const user = await answerAndSubmit();
    await user.click(
      screen.getByRole("button", { name: "Confirm and update to page 35" }),
    );

    expect(await screen.findByText(/That page cannot be saved/)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("submits librarian previews in preview mode and returns to the correct book panel", async () => {
    render(
      <QuizPlayer
        quizId={9}
        quizData={quizData}
        bookId={42}
        origin="librarian-preview"
        quizStatus="published"
      />,
    );

    const user = await answerAndSubmit();
    expect(submitQuizAttempt).toHaveBeenCalledWith({
      quizId: 9,
      answers: [0],
      preview: true,
    });
    expect(screen.queryByRole("button", { name: /Continue Reading/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Back to quiz panel/ }));
    expect(push).toHaveBeenCalledWith("/dashboard/librarian?quizBookId=42");
    expect(publishQuiz).not.toHaveBeenCalled();
  });

  it("publishes a draft preview and returns to the correct book panel", async () => {
    vi.mocked(publishQuiz).mockResolvedValue(undefined);
    render(
      <QuizPlayer
        quizId={9}
        quizData={quizData}
        bookId={42}
        origin="librarian-preview"
        quizStatus="draft"
      />,
    );

    const user = await answerAndSubmit();
    await user.click(
      screen.getByRole("button", { name: "Confirm, publish, and return" }),
    );

    await waitFor(() => expect(publishQuiz).toHaveBeenCalledWith(9));
    expect(push).toHaveBeenCalledWith("/dashboard/librarian?quizBookId=42");
    expect(refresh).toHaveBeenCalled();
  });
});
