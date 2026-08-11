import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPendingCheckpointForPage,
  markBookAsCompleted,
  updatePhysicalReadingProgress,
} from "@/app/(dashboard)/dashboard/student/actions";
import { UpdateReadingProgressDialog } from "@/components/dashboard/student/UpdateReadingProgressDialog";

const refresh = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));

vi.mock("@/app/(dashboard)/dashboard/student/actions", () => ({
  getPendingCheckpointForPage: vi.fn(),
  markBookAsCompleted: vi.fn(),
  updatePhysicalReadingProgress: vi.fn(),
}));

const successfulResult = (currentPage: number, changed = true) => ({
  success: true as const,
  data: {
    previousPage: changed ? 20 : currentPage,
    currentPage,
    totalPages: 100,
    progressPercent: currentPage,
    source: "manual_physical" as const,
    changed,
    movedBackward: currentPage < 20,
    reachedFinalPage: currentPage === 100,
    isNewBook: false,
  },
});

const renderDialog = (props: Partial<React.ComponentProps<typeof UpdateReadingProgressDialog>> = {}) =>
  render(
    <UpdateReadingProgressDialog
      bookId={1}
      bookTitle="The Test Book"
      currentPage={20}
      totalPages={100}
      fileFormat="pdf"
      {...props}
    />,
  );

describe("UpdateReadingProgressDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getPendingCheckpointForPage).mockResolvedValue({
      checkpointRequired: false,
    });
    vi.mocked(markBookAsCompleted).mockResolvedValue({
      success: true,
      newBadges: [],
      xpAwarded: 0,
      leveledUp: false,
    });
  });

  it("shows current and total pages plus the EPUB approximation warning", async () => {
    const user = userEvent.setup();
    renderDialog({ fileFormat: "epub" });

    await user.click(screen.getByRole("button", { name: "Update page" }));

    expect(screen.getByText("Current saved page: 20 of 100")).toBeInTheDocument();
    expect(
      screen.getByText(/Printed page numbers may not exactly match this EPUB edition/),
    ).toBeInTheDocument();
  });

  it.each([
    { value: "", message: "Enter the page you reached." },
    { value: "2.5", message: "Enter a whole page number." },
    { value: "0", message: "Page must be 1 or greater." },
    { value: "-3", message: "Page must be 1 or greater." },
    { value: "101", message: "Enter a page between 1 and 100." },
  ])("validates page input '$value'", async ({ value, message }) => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Update page" }));

    const input = screen.getByRole("spinbutton", { name: "Page" });
    fireEvent.change(input, { target: { value } });
    await user.click(screen.getByRole("button", { name: "Save progress" }));

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(updatePhysicalReadingProgress).not.toHaveBeenCalled();
  });

  it("asks for confirmation before moving progress backward", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhysicalReadingProgress).mockResolvedValue(
      successfulResult(15),
    );
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Update page" }));

    fireEvent.change(screen.getByRole("spinbutton", { name: "Page" }), {
      target: { value: "15" },
    });
    await user.click(screen.getByRole("button", { name: "Save progress" }));

    expect(
      screen.getByText("Your saved progress is page 20. Change it back to page 15?"),
    ).toBeInTheDocument();
    expect(updatePhysicalReadingProgress).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Change to page 15" }));
    await waitFor(() =>
      expect(updatePhysicalReadingProgress).toHaveBeenCalledWith({
        bookId: 1,
        currentPage: 15,
      }),
    );
  });

  it("disables duplicate submission while a save is pending", async () => {
    const user = userEvent.setup();
    let resolveSave: ((value: ReturnType<typeof successfulResult>) => void) | undefined;
    vi.mocked(updatePhysicalReadingProgress).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Update page" }));

    fireEvent.change(screen.getByRole("spinbutton", { name: "Page" }), {
      target: { value: "30" },
    });
    await user.click(screen.getByRole("button", { name: "Save progress" }));

    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(updatePhysicalReadingProgress).toHaveBeenCalledTimes(1);
    resolveSave?.(successfulResult(30));
    await screen.findByText("Progress updated to page 30.");
  });

  it("offers explicit completion after the final page and marks the book finished only after confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhysicalReadingProgress).mockResolvedValue(
      successfulResult(100),
    );
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Update page" }));

    fireEvent.change(screen.getByRole("spinbutton", { name: "Page" }), {
      target: { value: "100" },
    });
    await user.click(screen.getByRole("button", { name: "Save progress" }));

    expect(
      await screen.findByText(
        "You reached the final page. Mark this book as finished?",
      ),
    ).toBeInTheDocument();
    expect(markBookAsCompleted).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Mark as finished" }),
    );

    await waitFor(() =>
      expect(markBookAsCompleted).toHaveBeenCalledWith({ bookId: 1 }),
    );
    expect(
      await screen.findByText("The Test Book is marked as finished."),
    ).toBeInTheDocument();
  });

  it("surfaces a pending checkpoint without navigating until Start quiz is selected", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhysicalReadingProgress).mockResolvedValue(
      successfulResult(65),
    );
    vi.mocked(getPendingCheckpointForPage).mockResolvedValue({
      checkpointRequired: true,
      quizId: 9,
      checkpointPage: 50,
    });
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Update page" }));

    fireEvent.change(screen.getByRole("spinbutton", { name: "Page" }), {
      target: { value: "65" },
    });
    await user.click(screen.getByRole("button", { name: "Save progress" }));

    expect(
      await screen.findByText(/required reading checkpoint at page 50/i),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Start quiz" }));
    expect(push).toHaveBeenCalledWith(
      "/dashboard/student/quiz/9?bookId=1&page=50",
    );
  });

  it("does not show checkpoint messaging when no checkpoint is pending", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhysicalReadingProgress).mockResolvedValue(
      successfulResult(40),
    );
    vi.mocked(getPendingCheckpointForPage).mockResolvedValue({
      checkpointRequired: false,
    });
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Update page" }));

    fireEvent.change(screen.getByRole("spinbutton", { name: "Page" }), {
      target: { value: "40" },
    });
    await user.click(screen.getByRole("button", { name: "Save progress" }));

    await screen.findByText("Progress updated to page 40.");
    expect(getPendingCheckpointForPage).toHaveBeenCalledWith({
      bookId: 1,
      currentPage: 40,
    });
    expect(
      screen.queryByText(/required reading checkpoint/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start quiz" }),
    ).not.toBeInTheDocument();
  });

  it("does not offer completion again for an already completed book", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhysicalReadingProgress).mockResolvedValue(
      successfulResult(100),
    );
    renderDialog({ isCompleted: true });
    await user.click(screen.getByRole("button", { name: "Update page" }));

    fireEvent.change(screen.getByRole("spinbutton", { name: "Page" }), {
      target: { value: "100" },
    });
    await user.click(screen.getByRole("button", { name: "Save progress" }));

    await screen.findByText("Progress updated to page 100.");
    expect(
      screen.queryByText("You reached the final page. Mark this book as finished?"),
    ).not.toBeInTheDocument();
  });

  it("displays same-page and server validation messages", async () => {
    const user = userEvent.setup();
    vi.mocked(updatePhysicalReadingProgress)
      .mockResolvedValueOnce(successfulResult(20, false))
      .mockResolvedValueOnce({
        success: false,
        code: "PAGE_EXCEEDS_BOOK",
        message: "Enter a page between 1 and 100.",
      });
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Update page" }));

    await user.click(screen.getByRole("button", { name: "Save progress" }));
    expect(
      await screen.findByText("Your progress is already saved at page 20."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole("spinbutton", { name: "Page" }), {
      target: { value: "30" },
    });
    await user.click(screen.getByRole("button", { name: "Save progress" }));
    expect(
      await screen.findByText("Enter a page between 1 and 100."),
    ).toBeInTheDocument();
  });
});
