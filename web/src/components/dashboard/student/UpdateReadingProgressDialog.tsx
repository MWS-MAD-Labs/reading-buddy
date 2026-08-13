"use client";

import { FormEvent, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  markBookAsCompleted,
  updatePhysicalReadingProgress,
  type SaveReadingPositionResult,
} from "@/app/(dashboard)/dashboard/student/actions";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldError,
  FieldHelper,
  Input,
  Label,
} from "@/components/ui";

type UpdateReadingProgressDialogProps = {
  bookId: number;
  bookTitle: string;
  currentPage: number;
  totalPages: number | null;
  fileFormat: string | null;
  isCompleted?: boolean;
  onProgressUpdated?: (result: SaveReadingPositionResult) => void;
};

export function UpdateReadingProgressDialog({
  bookId,
  bookTitle,
  currentPage,
  totalPages,
  fileFormat,
  isCompleted = false,
  onProgressUpdated,
}: UpdateReadingProgressDialogProps) {
  const router = useRouter();
  const inputId = useId();
  const messageId = useId();
  const messageRef = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [savedPage, setSavedPage] = useState(currentPage);
  const [page, setPage] = useState(String(currentPage));
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [showCompletionPrompt, setShowCompletionPrompt] = useState(false);
  const [pendingCheckpoint, setPendingCheckpoint] = useState<{
    quizId: number;
    checkpointPage: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reset = () => {
    setPage(String(savedPage));
    setPendingPage(null);
    setShowCompletionPrompt(false);
    setPendingCheckpoint(null);
    setError(null);
    setSuccess(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return;
    setOpen(nextOpen);
    if (nextOpen) reset();
  };

  const validatePage = () => {
    if (page.trim() === "") return "Enter the page you reached.";

    const parsedPage = Number(page);
    if (!Number.isFinite(parsedPage) || !Number.isInteger(parsedPage)) {
      return "Enter a whole page number.";
    }
    if (parsedPage < 1) return "Page must be 1 or greater.";
    if (totalPages !== null && parsedPage > totalPages) {
      return `Enter a page between 1 and ${totalPages}.`;
    }

    return parsedPage;
  };

  const saveProgress = async (nextPage: number) => {
    setIsPending(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updatePhysicalReadingProgress({
        bookId,
        currentPage: nextPage,
      });

      if (!result.success) {
        if (result.code === "CHECKPOINT_REQUIRED") {
          setPendingCheckpoint(result.checkpoint);
          setPendingPage(null);
        } else {
          setPendingCheckpoint(null);
        }
        setError(result.message);
        requestAnimationFrame(() => messageRef.current?.focus());
        return;
      }

      const rewardMessage =
        result.data.xpAwarded > 0
          ? ` You earned ${result.data.xpAwarded} XP for ${result.data.rewardedPages} new physical-reading page${result.data.rewardedPages === 1 ? "" : "s"}.${result.data.rewardStatus === "daily_cap_reached" ? " Today's 20-page physical-reading reward limit reduced this award." : ""}`
          : result.data.rewardStatus === "daily_cap_reached"
            ? " Your progress was saved, but today's 20-page physical-reading reward limit has been reached."
            : result.data.rewardStatus === "already_rewarded"
              ? " This page range was already recorded, so no additional XP was awarded."
              : "";
      const message = result.data.changed
        ? `Progress updated to page ${result.data.currentPage}.${rewardMessage}`
        : `Your progress is already saved at page ${result.data.currentPage}.`;
      setSuccess(message);
      setSavedPage(result.data.currentPage);
      setPage(String(result.data.currentPage));
      setPendingPage(null);
      setPendingCheckpoint(null);
      setShowCompletionPrompt(result.data.reachedFinalPage && !completed);
      onProgressUpdated?.(result.data);
      router.refresh();
      requestAnimationFrame(() => messageRef.current?.focus());
    } catch {
      setError("We could not save your progress. Please try again.");
      requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      setIsPending(false);
    }
  };

  const handleMarkCompleted = async () => {
    setIsPending(true);
    setError(null);

    try {
      const result = await markBookAsCompleted({ bookId });
      if (!result.success) {
        setError("We could not mark this book as finished. Please try again.");
        return;
      }

      setCompleted(true);
      setShowCompletionPrompt(false);
      setSuccess(`${bookTitle} is marked as finished.`);
      router.refresh();
      requestAnimationFrame(() => messageRef.current?.focus());
    } catch {
      setError("We could not mark this book as finished. Please try again.");
      requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      setIsPending(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validatedPage = validatePage();

    if (typeof validatedPage === "string") {
      setError(validatedPage);
      setSuccess(null);
      requestAnimationFrame(() => messageRef.current?.focus());
      return;
    }

    if (validatedPage < savedPage) {
      setPendingPage(validatedPage);
      setError(null);
      setSuccess(null);
      return;
    }

    await saveProgress(validatedPage);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Update page
      </Button>

      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(event) => isPending && event.preventDefault()}
        onPointerDownOutside={(event) => isPending && event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Update your reading progress</DialogTitle>
          <DialogDescription>
            What page did you reach in your physical copy of {bookTitle}?
          </DialogDescription>
        </DialogHeader>

        {pendingPage !== null ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-[#5d4b4c]">
              Your saved progress is page {savedPage}. Change it back to page{" "}
              {pendingPage}?
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="neutral"
                disabled={isPending}
                onClick={() => setPendingPage(null)}
              >
                Keep page {savedPage}
              </Button>
              <Button
                type="button"
                loading={isPending}
                onClick={() => saveProgress(pendingPage)}
              >
                Change to page {pendingPage}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <p className="rounded-2xl bg-[#fffaf4] px-4 py-3 text-sm font-medium text-[#5d4b4c]">
              Current saved page: {savedPage}
              {totalPages !== null ? ` of ${totalPages}` : ""}
            </p>

            <div className="space-y-2">
              <Label htmlFor={inputId}>Page</Label>
              <Input
                id={inputId}
                name="page"
                type="number"
                inputMode="numeric"
                step={1}
                min={1}
                max={totalPages ?? undefined}
                value={page}
                disabled={isPending}
                aria-invalid={Boolean(error)}
                aria-describedby={messageId}
                onChange={(event) => {
                  setPage(event.target.value);
                  setError(null);
                  setSuccess(null);
                }}
              />
              <FieldHelper>
                {totalPages === null
                  ? "The total page count is unavailable for this book."
                  : `Enter a whole number from 1 to ${totalPages}.`}
              </FieldHelper>
            </div>

            {fileFormat?.toLowerCase() === "epub" && (
              <p className="rounded-2xl border border-[#D6A13A]/40 bg-[#fff8e8] px-4 py-3 text-sm leading-6 text-[#7a5311]">
                Printed page numbers may not exactly match this EPUB edition.
                Reading Buddy will use your page as an approximate resume position.
              </p>
            )}

            <div
              id={messageId}
              ref={messageRef}
              tabIndex={-1}
              aria-live="polite"
              className="space-y-3"
            >
              {error && <FieldError>{error}</FieldError>}
              {success && (
                <p className="text-sm font-bold text-[#4f704a]">{success}</p>
              )}

              {showCompletionPrompt && (
                <div className="space-y-3 rounded-2xl border border-[#73a66b]/40 bg-[#f4fbf2] px-4 py-3">
                  <p className="text-sm font-bold text-[#355b30]">
                    You reached the final page. Mark this book as finished?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setShowCompletionPrompt(false)}
                    >
                      Not yet
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      loading={isPending}
                      onClick={handleMarkCompleted}
                    >
                      Mark as finished
                    </Button>
                  </div>
                </div>
              )}

              {pendingCheckpoint && (
                <div className="space-y-3 rounded-2xl border border-[#D6A13A]/40 bg-[#fff8e8] px-4 py-3">
                  <p className="text-sm font-bold text-[#7a5311]">
                    Your progress was not updated. Complete the required quiz at page{" "}
                    {pendingCheckpoint.checkpointPage}, then try saving this page again.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      router.push(
                        `/dashboard/student/quiz/${pendingCheckpoint.quizId}?bookId=${bookId}&page=${pendingCheckpoint.checkpointPage}`,
                      )
                    }
                  >
                    Start quiz
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="neutral"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                Save progress
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
