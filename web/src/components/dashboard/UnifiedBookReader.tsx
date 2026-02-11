"use client";

/**
 * Unified Book Reader
 * Routes to appropriate reader based on book format
 * - All PDF books use image-based FlipBookReader
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
  pageImages?: PageImageInfo | null;
  textJsonUrl?: string | null;
  textExtractionStatus?: string | null;
  pageTextContent?: any;
  fileFormat?: "pdf" | "epub";
  isPictureBook?: boolean;
  onPageChange?: (pageNumber: number) => void;
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
  pageImages,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  textJsonUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  textExtractionStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pageTextContent,
  fileFormat = "pdf",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isPictureBook = false,
  onPageChange,
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

      // All PDF books use image-based rendering (FlipBookReader)
      // If images exist, use them; otherwise show error
      if (fileFormat === "pdf" || pdfUrl) {
        if (pageImages && pageImages.count > 0) {
          setTotalPageCount(pageImages.count);
          setReaderMode("images");
        } else {
          setError(
            "This book is still being processed. Images are being rendered. Please try again in a few minutes.",
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
  }, [fileFormat, epubUrl, pdfUrl, pageImages]);

  // Debounced save to database
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPageRef = useRef<number>(initialPage);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      onPageChange?.(page);

      // Debounce database save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(
        async () => {
          const isSignificantChange =
            page > lastSavedPageRef.current ||
            Math.abs(page - lastSavedPageRef.current) >= 2;

          if (isSignificantChange || page === initialPage) {
            try {
              await recordReadingProgress({ bookId, currentPage: page });
              lastSavedPageRef.current = page;

              // Check for required checkpoint quiz
              const checkpoint = await getPendingCheckpointForPage({
                bookId,
                currentPage: page,
              });

              if (checkpoint.checkpointRequired && checkpoint.quizId) {
                router.push(
                  `/dashboard/student/quiz/${checkpoint.quizId}?bookId=${bookId}&page=${page}`,
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
          epubUrl={epubUrl}
          bookTitle={bookTitle}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          onTotalPages={(count) => {
            setTotalPageCount(count);
            updateBookTotalPages(bookId, count).catch(console.error);
          }}
        />

        {/* Reader Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3">
          <div className="flex items-center gap-2 text-sm text-indigo-600">
            <span className="font-medium">📍 Page {currentPage}</span>
            {totalPageCount && (
              <span className="text-indigo-400">of {totalPageCount}</span>
            )}
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              📚 EPUB Mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/journal/${bookId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              📓 Book Journal
            </Link>
            <button
              onClick={() => setIsNotesPanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
            >
              📝 Notes
            </button>
            {showFinishButton && onComplete && (
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:scale-105 animate-pulse"
              >
                ✅ Finish Reading
              </button>
            )}
          </div>
        </div>

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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3">
          <div className="flex items-center gap-2 text-sm text-indigo-600">
            <span className="font-medium">📍 Page {currentPage}</span>
            <span className="text-indigo-400">of {pageImages.count}</span>
            <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              📖 Picture Book
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/journal/${bookId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              📓 Book Journal
            </Link>
            <button
              onClick={() => setIsNotesPanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105"
            >
              📝 Notes
            </button>
            {showFinishButton && onComplete && (
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:scale-105 animate-pulse"
              >
                ✅ Finish Reading
              </button>
            )}
          </div>
        </div>

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
