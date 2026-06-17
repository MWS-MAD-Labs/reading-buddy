"use client";

/**
 * Unified Book Reader
 * Routes to the appropriate reader based on book format
 * - All PDF books use rendered page images via FlipBookReader
 * - EPUB files use EpubFlipReader
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  recordReadingProgress,
  updateBookTotalPages,
  getPendingCheckpointForPage,
} from "@/app/(dashboard)/dashboard/student/actions";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ReaderNotesPanel } from "./reader/ReaderNotesPanel";

// Dynamically import readers to reduce initial bundle
const FlipBookReader = dynamic(
  () => import("./FlipBookReader").then((mod) => mod.FlipBookReader),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg font-semibold text-purple-600">
          Loading reader...
        </div>
      </div>
    ),
  },
);

const EpubFlipReader = dynamic(
  () => import("./EpubFlipReader").then((mod) => mod.EpubFlipReader),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center">
        <div className="text-lg font-semibold text-purple-600">
          Loading EPUB reader...
        </div>
      </div>
    ),
  },
);

type PageImageInfo = {
  baseUrl: string;
  count: number;
};

type UnifiedBookReaderProps = {
  bookId: number;
  bookTitle?: string;
  pdfUrl: string;
  epubUrl?: string | null;
  initialPage?: number;
  initialCfi?: string | null;
  pageImages?: PageImageInfo | null;
  fileFormat?: "pdf" | "epub";
  onPageChange?: (pageNumber: number) => void;
  onTotalPagesChange?: (totalPages: number | null) => void;
  onComplete?: () => void;
  showFinishButton?: boolean;
};

type ReaderMode = "epub" | "images" | "error" | "loading";

export function UnifiedBookReader({
  bookId,
  bookTitle,
  pdfUrl,
  epubUrl,
  initialPage = 1,
  initialCfi = null,
  pageImages,
  fileFormat = "pdf",
  onPageChange,
  onTotalPagesChange,
  onComplete,
  showFinishButton = false,
}: UnifiedBookReaderProps) {
  const router = useRouter();
  const [readerMode, setReaderMode] = useState<ReaderMode>("loading");
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(
    typeof initialPage === "string"
      ? parseInt(initialPage, 10)
      : initialPage || 0,
  );
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
  const [totalPageCount, setTotalPageCount] = useState<number | null>(null);
  const hasRenderedImages = Boolean(pageImages && pageImages.count > 0);

  // Determine reader mode based on book format
  useEffect(() => {
    const determineMode = () => {
      setReaderMode("loading");
      setError(null);

      // EPUB files use native EPUB reader
      if (fileFormat === "epub" || epubUrl) {
        setReaderMode("epub");
        return;
      }

      // PDFs always use rendered page images.
      if (fileFormat === "pdf" || pdfUrl) {
        if (hasRenderedImages && pageImages) {
          setTotalPageCount(pageImages.count);
          setReaderMode("images");
        } else {
          setError(
            "This book is still being processed. Pages are being rendered. Please try again in a few minutes.",
          );
          setReaderMode("error");
        }
        return;
      }

      // Unknown format
      setError(
        "This book format is not supported. Please contact your librarian.",
      );
      setReaderMode("error");
    };

    determineMode();
  }, [epubUrl, fileFormat, hasRenderedImages, pageImages, pdfUrl]);

  // Debounced save to database
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPageRef = useRef<number>(initialPage);

  const scheduleProgressSave = useCallback(
    (payload: {
      page: number;
      epubCfi?: string | null;
      progressPercent?: number | null;
    }) => {
      setCurrentPage(payload.page);
      onPageChange?.(payload.page);

      // Debounce database save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(
        async () => {
          const isSignificantChange =
            payload.page > lastSavedPageRef.current ||
            Math.abs(payload.page - lastSavedPageRef.current) >= 2;

          if (isSignificantChange || payload.page === initialPage) {
            try {
              await recordReadingProgress({
                bookId,
                currentPage: payload.page,
                epubCfi: payload.epubCfi,
                progressPercent: payload.progressPercent,
              });
              lastSavedPageRef.current = payload.page;

              // Check for required checkpoint quiz
              const checkpoint = await getPendingCheckpointForPage({
                bookId,
                currentPage: payload.page,
              });

              if (checkpoint.checkpointRequired && checkpoint.quizId) {
                router.push(
                  `/dashboard/student/quiz/${checkpoint.quizId}?bookId=${bookId}&page=${payload.page}`,
                );
              }
            } catch (err) {
              console.error("Failed to save reading progress:", err);
            }
          }
        },
        process.env.NODE_ENV === "test" ? 500 : 3000,
      );
    },
    [bookId, initialPage, onPageChange, router],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      scheduleProgressSave({ page });
    },
    [scheduleProgressSave],
  );

  const handleEpubRelocation = useCallback(
    (payload: {
      pageNumber: number;
      cfi: string | null;
      progressPercent: number | null;
    }) => {
      scheduleProgressSave({
        page: payload.pageNumber,
        epubCfi: payload.cfi,
        progressPercent: payload.progressPercent,
      });
    },
    [scheduleProgressSave],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    onTotalPagesChange?.(totalPageCount);
  }, [onTotalPagesChange, totalPageCount]);

  // Error state
  if (readerMode === "error") {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border-4 border-red-300 bg-red-50 p-8">
          <div className="text-center">
            <span className="text-4xl">📚</span>
            <h3 className="mt-4 text-xl font-bold text-red-800">
              Unable to Load Book
            </h3>
            <p className="mt-2 text-red-600">{error}</p>
          </div>
        </div>
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-600"
        >
          ← Back to Library
        </Link>
      </div>
    );
  }

  // Loading state
  if (readerMode === "loading") {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-lg font-semibold text-purple-600">
            Loading book...
          </p>
        </div>
      </div>
    );
  }

  // EPUB mode - use EpubFlipReader
  if (readerMode === "epub" && epubUrl) {
    return (
      <div className="space-y-4">
        <EpubFlipReader
          bookId={bookId}
          epubUrl={epubUrl}
          bookTitle={bookTitle}
          initialPage={initialPage}
          initialCfi={initialCfi}
          onRelocation={handleEpubRelocation}
          onTotalPages={(count) => {
            setTotalPageCount(count);
            updateBookTotalPages(bookId, count).catch(console.error);
          }}
        />

        {/* Reader Actions Bar */}
        <Card
          variant="frosted"
          padding="snug"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="heading-font text-sm font-bold text-[#7E1518]">
              📍 Page {currentPage}
            </span>
            {totalPageCount && (
              <span className="text-sm font-medium text-[#5d4b4c]">
                of {totalPageCount}
              </span>
            )}
            <Badge variant="lime" size="sm">
              EPUB mode
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/journal/${bookId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              📓 Book Journal
            </Link>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsNotesPanelOpen(true)}
            >
              📝 Notes
            </Button>
            {showFinishButton && onComplete && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onComplete}
                className="animate-pulse"
              >
                ✅ Finish Reading
              </Button>
            )}
          </div>
        </Card>

        {/* Notes Panel */}
        <ReaderNotesPanel
          bookId={bookId}
          currentPage={currentPage}
          isOpen={isNotesPanelOpen}
          onClose={() => setIsNotesPanelOpen(false)}
          onPageJump={(page) => handlePageChange(page)}
        />
      </div>
    );
  }

  // Image mode - use FlipBookReader for all PDF books
  if (readerMode === "images" && pageImages) {
    return (
      <div className="space-y-4">
        <FlipBookReader
          pageImages={pageImages}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          fallbackPdfUrl={pdfUrl}
        />

        {/* Reader Actions Bar */}
        <Card
          variant="frosted"
          padding="snug"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="heading-font text-sm font-bold text-[#7E1518]">
              📍 Page {currentPage}
            </span>
            <span className="text-sm font-medium text-[#5d4b4c]">
              of {pageImages.count}
            </span>
            <Badge variant="amber" size="sm">
              Picture book
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/journal/${bookId}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              📓 Book Journal
            </Link>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsNotesPanelOpen(true)}
            >
              📝 Notes
            </Button>
            {showFinishButton && onComplete && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onComplete}
                className="animate-pulse"
              >
                ✅ Finish Reading
              </Button>
            )}
          </div>
        </Card>

        {/* Notes Panel */}
        <ReaderNotesPanel
          bookId={bookId}
          currentPage={currentPage}
          isOpen={isNotesPanelOpen}
          onClose={() => setIsNotesPanelOpen(false)}
          onPageJump={(page) => handlePageChange(page)}
        />
      </div>
    );
  }

  // Fallback
  return null;
}
