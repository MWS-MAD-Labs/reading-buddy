"use client";

import { useState } from "react";
import {
  updateBookJournal,
  type BookJournal,
} from "@/app/(dashboard)/dashboard/journal/journal-actions";
import {
  Badge,
  Card,
  CardDescription,
  CardTitle,
  StarRating,
} from "@/components/ui";
import { cn } from "@/lib/cn";

interface BookJournalHeaderProps {
  book: {
    id: number;
    title: string;
    author?: string;
    cover_url?: string;
    page_count?: number;
  };
  progress?: {
    current_page: number;
    completed: boolean;
    completed_at?: string;
    started_at?: string;
  } | null;
  bookJournal: BookJournal | null;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BookJournalHeader({
  book,
  progress,
  bookJournal,
}: BookJournalHeaderProps) {
  const [rating, setRating] = useState(bookJournal?.personal_rating ?? 0);
  const [isSavingRating, setIsSavingRating] = useState(false);

  const progressPercent =
    book.page_count && progress?.current_page
      ? Math.min(
          100,
          Math.round((progress.current_page / book.page_count) * 100),
        )
      : 0;

  const handleRatingChange = async (newRating: number) => {
    setRating(newRating);
    setIsSavingRating(true);
    try {
      await updateBookJournal({
        bookId: book.id,
        personalRating: newRating,
      });
    } catch (error) {
      console.error("Failed to save rating:", error);
      setRating(bookJournal?.personal_rating ?? 0);
    } finally {
      setIsSavingRating(false);
    }
  };

  return (
    <Card variant="glow" padding="cozy">
      <div className="flex flex-col gap-6 sm:flex-row">
        {book.cover_url && (
          <div className="shrink-0">
            <img
              src={book.cover_url}
              alt={`Cover of ${book.title}`}
              className="h-40 w-28 rounded-xl object-cover shadow-md sm:h-48 sm:w-32"
            />
          </div>
        )}

        <div className="flex-1 space-y-5">
          <div>
            <Badge variant="amber" size="sm">
              Book Journal
            </Badge>
            <CardTitle className="mt-3 text-2xl text-[#7E1518]">
              {book.title}
            </CardTitle>
            {book.author && <CardDescription>by {book.author}</CardDescription>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-[#5d4b4c]">
                {progress?.completed ? (
                  <span className="flex items-center gap-1 font-bold text-[#486142]">
                    Completed
                  </span>
                ) : (
                  <>
                    Page {progress?.current_page ?? 0} of{" "}
                    {book.page_count ?? "?"}
                  </>
                )}
              </span>
              <Badge variant={progress?.completed ? "lime" : "sky"} size="sm">
                {progressPercent}%
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#eadfda]">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progress?.completed ? "bg-[#6F8B6A]" : "bg-[#D6A13A]",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#5d4b4c]">
              My Rating:
            </span>
            <StarRating
              value={rating}
              onChange={handleRatingChange}
              size="lg"
            />
            {isSavingRating && (
              <span className="text-xs font-medium text-[#7a5311]">
                Saving...
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {progress?.started_at && (
              <Badge variant="neutral" className="normal-case tracking-normal">
                Started {formatDate(progress.started_at)}
              </Badge>
            )}
            {progress?.completed_at && (
              <Badge variant="lime" className="normal-case tracking-normal">
                Finished {formatDate(progress.completed_at)}
              </Badge>
            )}
            <Badge variant="outline" className="normal-case tracking-normal">
              {bookJournal?.notes_count ?? 0} notes
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
