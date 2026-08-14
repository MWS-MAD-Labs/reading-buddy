import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { getUserReview } from "@/app/(dashboard)/dashboard/library/review-actions";
import { markBookAsCompleted } from "@/app/(dashboard)/dashboard/student/actions";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/app/(dashboard)/dashboard/library/review-actions", () => ({
  getUserReview: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/app/(dashboard)/dashboard/student/actions", () => ({
  markBookAsCompleted: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/components/dashboard/RatingPromptModal", () => ({
  RatingPromptModal: ({ onSubmitted }: { onSubmitted?: () => void }) => (
    <div>
      <p>Review required</p>
      <button type="button" onClick={onSubmitted}>Submit Review and Finish</button>
    </div>
  ),
}));

vi.mock("@/components/dashboard/UnifiedBookReader", () => ({
  UnifiedBookReader: ({
    onComplete,
    showFinishButton,
  }: {
    onComplete?: () => void;
    showFinishButton?: boolean;
  }) => (
    <div>
      {showFinishButton && (
        <button type="button" onClick={onComplete}>
          Finish Reading
        </button>
      )}
    </div>
  ),
}));

describe("ReaderWithRatingPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getUserReview).mockResolvedValue(null);
    vi.mocked(markBookAsCompleted).mockResolvedValue({ success: true } as Awaited<ReturnType<typeof markBookAsCompleted>>);
    refresh.mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("shows the finish control when opened directly at the completion threshold", async () => {
    const { ReaderWithRatingPrompt } = await import(
      "@/components/dashboard/ReaderWithRatingPrompt"
    );

    render(
      <ReaderWithRatingPrompt
        bookId={1}
        bookTitle="Test Book"
        pdfUrl="/books/test.pdf"
        initialPage={10}
        pageImages={{ baseUrl: "/pages/test", count: 10 }}
        fileFormat="pdf"
        totalPages={10}
      />,
    );

    expect(screen.queryByRole("button", { name: /finish reading/i })).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(
      screen.getByRole("button", { name: /finish reading/i }),
    ).toBeInTheDocument();
  });

  it("asks an unreviewed reader for a review before completion", async () => {
    const { ReaderWithRatingPrompt } = await import(
      "@/components/dashboard/ReaderWithRatingPrompt"
    );

    render(
      <ReaderWithRatingPrompt
        bookId={1}
        bookTitle="Test Book"
        pdfUrl="/books/test.pdf"
        initialPage={10}
        totalPages={10}
      />,
    );
    await act(async () => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole("button", { name: /finish reading/i }));

    expect(screen.getByText("Review required")).toBeInTheDocument();
    expect(markBookAsCompleted).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Submit Review and Finish" }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("lets a reader with an existing review confirm completion", async () => {
    vi.mocked(getUserReview).mockResolvedValue({ id: "review-1" } as Awaited<ReturnType<typeof getUserReview>>);
    const { ReaderWithRatingPrompt } = await import(
      "@/components/dashboard/ReaderWithRatingPrompt"
    );

    render(
      <ReaderWithRatingPrompt
        bookId={1}
        bookTitle="Test Book"
        pdfUrl="/books/test.pdf"
        initialPage={10}
        totalPages={10}
      />,
    );
    await act(async () => {
      await vi.waitFor(() => expect(getUserReview).toHaveBeenCalledWith(1));
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole("button", { name: /finish reading/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /yes, i'm done/i }));
      await Promise.resolve();
    });

    expect(markBookAsCompleted).toHaveBeenCalledWith({ bookId: 1 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
