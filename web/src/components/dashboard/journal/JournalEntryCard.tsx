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
    icon: string;
    badgeVariant: "bubble" | "sky" | "lime" | "amber" | "neutral" | "outline";
    accentClassName: string;
    softSurfaceClassName: string;
  }
> = {
  note: {
    label: "Note",
    icon: "📝",
    badgeVariant: "amber",
    accentClassName: "bg-[#D6A13A]",
    softSurfaceClassName: "bg-[#FBF2DF]",
  },
  quote: {
    label: "Quote",
    icon: "💬",
    badgeVariant: "sky",
    accentClassName: "bg-[#B8DDF8]",
    softSurfaceClassName: "bg-[#EFF8FE]",
  },
  question: {
    label: "Question",
    icon: "❓",
    badgeVariant: "sky",
    accentClassName: "bg-[#B8DDF8]",
    softSurfaceClassName: "bg-[#EFF8FE]",
  },
  reading_session: {
    label: "Reading Progress",
    icon: "📖",
    badgeVariant: "sky",
    accentClassName: "bg-[#B8DDF8]",
    softSurfaceClassName: "bg-[#EFF8FE]",
  },
  achievement: {
    label: "Growing",
    icon: "🏅",
    badgeVariant: "amber",
    accentClassName: "bg-[#D6A13A]",
    softSurfaceClassName: "bg-[#FBF2DF]",
  },
  started_book: {
    label: "Started Reading",
    icon: "📚",
    badgeVariant: "sky",
    accentClassName: "bg-[#B8DDF8]",
    softSurfaceClassName: "bg-[#EFF8FE]",
  },
  finished_book: {
    label: "Completed",
    icon: "🏁",
    badgeVariant: "lime",
    accentClassName: "bg-[#6F8B6A]",
    softSurfaceClassName: "bg-[#EDF3EB]",
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
    label: "Journal Entry",
    icon: "📓",
    badgeVariant: "neutral" as const,
    accentClassName: "bg-[#D6A13A]",
    softSurfaceClassName: "bg-[#fffaf4]",
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
        "Please add a rating and a short reflection before resubmitting.",
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
        setSubmitError(result.error || "Could not resubmit the review yet.");
      }
    } catch (error) {
      console.error("Failed to resubmit review:", error);
      setSubmitError("Could not resubmit the review yet. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="amber" size="sm">
            Evidence ready
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="lime" size="sm">
            Completed
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            size="sm"
            className="bg-[#F8EAEB] text-[#B94A4E]"
          >
            Needs reflection
          </Badge>
        );
      default:
        return null;
    }
  };

  const getUnattachedEntryMessage = () => {
    if (entry.entry_type === "achievement") {
      return "A moment of growth earned across the reading journey.";
    }

    if (
      entry.entry_type === "note" &&
      entry.metadata?.scope === "general_reflection"
    ) {
      return "General journal reflection.";
    }

    if (
      ["started_book", "finished_book", "reading_session"].includes(
        entry.entry_type,
      )
    ) {
      return "The original book for this reading activity is no longer available.";
    }

    return "General journal entry.";
  };

  const contentLabel =
    entry.entry_type === "quote" ? "Saved quote" : "Journal reflection";

  return (
    <Card
      variant="frosted"
      padding="snug"
      className="motion-hover-lift relative overflow-hidden bg-white text-[#241718]"
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          config.accentClassName,
        )}
      />
      <div
        className={cn(
          "absolute -left-[2.35rem] top-6 h-3 w-3 rounded-full ring-4 ring-[#fffaf4]",
          entry.review_status === "REJECTED"
            ? "bg-[#B94A4E]"
            : config.accentClassName,
        )}
        aria-hidden="true"
      />

      <div className="space-y-5 pl-3">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-2xl text-lg",
                config.softSurfaceClassName,
              )}
              aria-hidden="true"
            >
              {config.icon}
            </div>
            <div>
              <Badge variant={config.badgeVariant} size="sm">
                {config.label}
              </Badge>
              <p className="mt-1 text-xs font-medium text-[#6f6061]">
                Saved at {time}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.review_status && getStatusBadge(entry.review_status)}
            {entry.page_number && entry.entry_type !== "reading_session" && (
              <Badge
                variant="outline"
                size="sm"
                className="normal-case tracking-normal"
              >
                Page {entry.page_number}
              </Badge>
            )}
          </div>
        </header>

        {entry.content && (
          <section aria-label={contentLabel}>
            {entry.entry_type === "quote" ? (
              <blockquote className="quote-font rounded-3xl border border-[#B8DDF8]/55 bg-[#EFF8FE] px-5 py-4 text-lg leading-8 text-[#1F2A44]">
                “{entry.content}”
              </blockquote>
            ) : (
              <p className="whitespace-pre-wrap text-base leading-7 text-[#241718]">
                {entry.content}
              </p>
            )}
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          {entry.entry_type === "reading_session" &&
            entry.page_range_start &&
            entry.page_range_end && (
              <Badge variant="sky" className="normal-case tracking-normal">
                Pages {entry.page_range_start} → {entry.page_range_end}
              </Badge>
            )}
          {entry.entry_type === "reading_session" &&
            entry.reading_duration_minutes && (
              <Badge variant="amber" className="normal-case tracking-normal">
                {entry.reading_duration_minutes} min of progress
              </Badge>
            )}
        </div>

        {entry.entry_type === "finished_book" && entry.review_status && (
          <section
            className="rounded-3xl border border-[#eadfda] bg-[#fffaf4] p-4"
            aria-label="Book review status"
          >
            {entry.review_status === "REJECTED" &&
              entry.review_rejection_feedback &&
              !isEditingReview && (
                <div className="mb-4 rounded-2xl border border-[#B94A4E]/25 bg-[#F8EAEB] p-4">
                  <div className="mb-1 heading-font text-xs font-bold uppercase tracking-wide text-[#B94A4E]">
                    Guided reflection
                  </div>
                  <p className="mb-3 text-sm leading-6 text-[#7E1518]">
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
                    Revise reflection
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
                  <Label className="mb-1">Reflection min 10 characters</Label>
                  <textarea
                    value={editComment}
                    onChange={(event) => setEditComment(event.target.value)}
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
                    Submit reflection
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
                <StarRating
                  value={entry.review_rating || 0}
                  size="sm"
                  readonly
                />
                {entry.review_comment && (
                  <p className="mt-2 text-sm italic leading-6 text-[#5d4b4c]">
                    “{entry.review_comment}”
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        <aside className="rounded-3xl border border-[#eadfda] bg-[#fffaf4] p-4">
          {entry.book_id && entry.book_title ? (
            <div className="flex gap-4">
              {entry.book_cover_url && (
                <img
                  src={entry.book_cover_url}
                  alt={`Cover of ${entry.book_title}`}
                  className="h-24 w-16 shrink-0 rounded-2xl object-cover shadow-[0_12px_30px_rgba(36,23,24,0.08)]"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <Badge variant="sky" size="sm">
                  Book context
                </Badge>
                <Link
                  href={`/dashboard/journal/${entry.book_id}`}
                  className="heading-font mt-2 block text-base font-bold leading-tight text-[#7E1518] hover:underline"
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
                Reflection context
              </Badge>
              <p className="text-sm leading-6 text-[#6f6061]">
                {getUnattachedEntryMessage()}
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
                Open book
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
                Share reflection
              </Button>
            )}

            {showConfirmDelete ? (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl bg-[#F8EAEB] p-2">
                <span className="text-xs font-medium text-[#B94A4E]">
                  Delete this entry?
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
