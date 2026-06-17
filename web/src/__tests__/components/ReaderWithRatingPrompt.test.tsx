import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

vi.mock("@/app/(dashboard)/dashboard/library/review-actions", () => ({
  getUserReview: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/app/(dashboard)/dashboard/student/actions", () => ({
  markBookAsCompleted: vi.fn(() => Promise.resolve({ success: true })),
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
});
