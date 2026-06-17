"use client";

import Link from "next/link";
import { useState } from "react";
import type { JournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { deleteJournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { resubmitReview } from "@/app/(dashboard)/dashboard/library/review-actions";
import {
  Badge,
  Button,
  Card,
  FieldError,
  Label,
  StarRating,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { ShareJournalNoteModal } from "./ShareJournalNoteModal";

interface JournalEntryCardProps {
  entry: JournalEntry;
}

const entryTypeConfig: Record<
  string,
  {
    label: string;
    badgeVariant: "bubble" | "sky" | "lime" | "amber" | "neutral" | "outline";
    surfaceClassName: string;
  }
> = {
  note: {
    label: "Note",
    badgeVariant: "amber",
    surfaceClassName: "from-[#fffaf4] via-white to-[#FBF2DF]",
  },
  reading_session: {
    label: "Reading Session",
    badgeVariant: "sky",
    surfaceClassName: "from-[#EFF8FE] via-white to-[#fffaf4]",
  },
  achievement: {
    label: "Achievement",
    badgeVariant: "bubble",
    surfaceClassName: "from-[#F5E7E8] via-white to-[#FBF2DF]",
  },
  quote: {
    label: "Quote",
    badgeVariant: "lime",
    surfaceClassName: "from-[#EDF3EB] via-white to-[#fffaf4]",
  },
  question: {
    label: "Question",
    badgeVariant: "bubble",
    surfaceClassName: "from-[#F5E7E8] via-white to-[#EFF8FE]",
  },
  started_book: {
    label: "Started Reading",
    badgeVariant: "sky",
    surfaceClassName: "from-[#EFF8FE] via-white to-[#FBF2DF]",
  },
  finished_book: {
    label: "Finished Book",
    badgeVariant: "lime",
    surfaceClassName: "from-[#EDF3EB] via-white to-[#EFF8FE]",
  },
};

export function JournalEntryCard({
  entry: initialEntry,
}: JournalEntryCardProps) {
  const [entry, setEntry] = useState(initialEntry);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editRating, setEditRating] = useState(entry.review_rating || 0);
  const [editComment, setEditComment] = useState(entry.review_comment || "");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const config = entryTypeConfig[entry.entry_type] ?? {
    label: "Entry",
    badgeVariant: "neutral" as const,
    surfaceClassName: "from-white via-[#fffaf4] to-[#EFF8FE]",
  };

  const time = new Date(entry.created_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteJournalEntry(entry.id);
    } catch (error) {
      console.error("Failed to delete entry:", error);
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleResubmitReview = async () => {
    if (
      !entry.review_id ||
      editRating === 0 ||
      editComment.trim().length < 10
    ) {
      setSubmitError(
        "Please provide a rating and comment (min 10 characters).",
      );
      return;
    }

    setIsSubmittingReview(true);
    setSubmitError(null);

    try {
      const result = await resubmitReview(
        entry.review_id,
        editRating,
        editComment,
      );
      if (result.success) {
        setEntry((prev) => ({
          ...prev,
          review_rating: editRating,
          review_comment: editComment,
          review_status: "PENDING",
          review_rejection_feedback: null,
        }));
        setIsEditingReview(false);
      } else {
        setSubmitError(result.error || "Failed to resubmit review");
      }
    } catch (error) {
      console.error("Failed to resubmit review:", error);
      setSubmitError("An error occurred. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="amber" size="sm">
            Pending Review
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="lime" size="sm">
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            size="sm"
            className="bg-[#F8EAEB] text-[#B94A4E]"
          >
            Needs Revision
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card
      variant="playful"
      padding="snug"
      className={cn(
        "relative bg-linear-to-br transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(36,23,24,0.1)]",
        config.surfaceClassName,
      )}
    >
      <div
        className={cn(
          "absolute -left-[2.55rem] top-5 h-3 w-3 rounded-full ring-4 ring-white",
          entry.review_status === "REJECTED" ? "bg-[#B94A4E]" : "bg-[#D6A13A]",
        )}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <Badge variant={config.badgeVariant} size="sm">
              {config.label}
            </Badge>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {entry.review_status && getStatusBadge(entry.review_status)}
              <Badge variant="neutral" size="sm">
                {time}
              </Badge>
            </div>
          </div>

          {entry.content && (
            <p className="whitespace-pre-wrap text-base leading-7 text-[#241718]">
              {entry.entry_type === "quote" ? (
                <span className="italic">&ldquo;{entry.content}&rdquo;</span>
              ) : (
                entry.content
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {entry.entry_type === "reading_session" &&
              entry.page_range_start &&
              entry.page_range_end && (
                <Badge
                  variant="neutral"
                  className="normal-case tracking-normal"
                >
                  Pages {entry.page_range_start} → {entry.page_range_end}
                </Badge>
              )}
            {entry.entry_type === "reading_session" &&
              entry.reading_duration_minutes && (
                <Badge
                  variant="neutral"
                  className="normal-case tracking-normal"
                >
                  Duration {entry.reading_duration_minutes} min
                </Badge>
              )}
            {entry.page_number && entry.entry_type !== "reading_session" && (
              <Badge variant="outline" className="normal-case tracking-normal">
                Page {entry.page_number}
              </Badge>
            )}
          </div>

          {entry.entry_type === "finished_book" && entry.review_status && (
            <div className="rounded-2xl border border-[#eadfda] bg-white/75 p-3">
              {entry.review_status === "REJECTED" &&
                entry.review_rejection_feedback &&
                !isEditingReview && (
                  <div className="mb-3 rounded-2xl border border-[#B94A4E]/25 bg-[#F8EAEB] p-3">
                    <div className="mb-1 text-xs font-bold text-[#B94A4E]">
                      Librarian Feedback
                    </div>
                    <p className="mb-2 text-xs leading-5 text-[#8b3639]">
                      {entry.review_rejection_feedback}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingReview(true);
                        setEditRating(entry.review_rating || 0);
                        setEditComment(entry.review_comment || "");
                        setSubmitError(null);
                      }}
                      className="min-h-0 px-0 py-0 text-[#B94A4E] underline hover:bg-transparent"
                    >
                      Revise Review
                    </Button>
                  </div>
                )}

              {isEditingReview ? (
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1">Rating</Label>
                    <StarRating
                      value={editRating}
                      onChange={setEditRating}
                      size="md"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">Comment (min 10 chars)</Label>
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      className="focus-ring w-full rounded-2xl border border-[#eadfda] bg-white px-3 py-2 text-sm text-[#241718] focus-visible:border-[#D6A13A]"
                      rows={3}
                    />
                  </div>
                  {submitError && <FieldError>{submitError}</FieldError>}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleResubmitReview}
                      disabled={
                        editRating === 0 || editComment.trim().length < 10
                      }
                      loading={isSubmittingReview}
                    >
                      Submit Revision
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingReview(false)}
                      disabled={isSubmittingReview}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <StarRating
                      value={entry.review_rating || 0}
                      size="sm"
                      readonly
                    />
                  </div>
                  {entry.review_comment && (
                    <p className="text-sm italic leading-6 text-[#5d4b4c]">
                      &ldquo;{entry.review_comment}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="self-start rounded-[24px] border border-[#eadfda] bg-white/75 p-4 shadow-[0_12px_30px_rgba(36,23,24,0.04)] lg:max-w-xl">
          {entry.book_id && entry.book_title ? (
            <div className="flex gap-4">
              {entry.book_cover_url && (
                <img
                  src={entry.book_cover_url}
                  alt={`Cover of ${entry.book_title}`}
                  className="h-28 w-20 shrink-0 rounded-xl object-cover shadow-md"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <Badge variant="sky" size="sm" className="mb-2">
                  Book
                </Badge>
                <Link
                  href={`/dashboard/journal/${entry.book_id}`}
                  className="heading-font block text-base font-bold leading-tight text-[#7E1518] hover:underline"
                >
                  {entry.book_title}
                </Link>
                {entry.book_author && (
                  <p className="text-sm leading-5 text-[#6f6061]">
                    by {entry.book_author}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge variant="neutral" size="sm">
                Journal
              </Badge>
              <p className="text-sm leading-6 text-[#6f6061]">
                This entry is not attached to a specific book.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eadfda] pt-3">
            {entry.book_id && (
              <Link
                href={`/dashboard/student/read/${entry.book_id}${entry.page_number ? `?page=${entry.page_number}` : ""}`}
                className={cn(
                  buttonVariants({ variant: "primary", size: "sm" }),
                  "flex-1 no-underline",
                )}
              >
                Open
              </Link>
            )}

            {entry.entry_type === "note" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowShareModal(true)}
                className="flex-1"
              >
                Share
              </Button>
            )}

            {showConfirmDelete ? (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl bg-[#F8EAEB] p-2">
                <span className="text-xs font-medium text-[#B94A4E]">
                  Delete?
                </span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  loading={isDeleting}
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  No
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmDelete(true)}
                className="text-[#6f6061] hover:text-[#B94A4E]"
              >
                Delete
              </Button>
            )}
          </div>
        </aside>
      </div>

      <ShareJournalNoteModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        entry={entry}
      />
    </Card>
  );
}
