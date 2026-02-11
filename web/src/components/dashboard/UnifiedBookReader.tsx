"use client";

/**
 * Unified Book Reader
 * Routes to appropriate reader based on book format and availability
 * - Picture books use image-based FlipBookReader
 * - EPUB files use EpubFlipReader
 * - Books with extracted text use TextFlipReader
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
import type { BookTextJSON } from "@/lib/text-storage";

// Dynamically import readers to reduce initial bundle
const TextFlipReader = dynamic(
  () => import("./TextFlipReader").then((mod) => mod.TextFlipReader),
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

type ReaderMode = "text" | "epub" | "images" | "error" | "loading";

export function UnifiedBookReader({
  bookId,
  bookTitle,
  pdfUrl,
  epubUrl,
  initialPage = 1,
  pageImages,
  textJsonUrl,
  textExtractionStatus,
  pageTextContent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fileFormat = "pdf",
  isPictureBook = false,
  onPageChange,
  onComplete,
  showFinishButton = false,
}: UnifiedBookReaderProps) {
  const router = useRouter();
  const [readerMode, setReaderMode] = useState<ReaderMode>("loading");
  const [textContent, setTextContent] = useState<BookTextJSON | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(
    typeof initialPage === "string"
      ? parseInt(initialPage, 10)
      : initialPage || 0,
  );
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState(false);
  const [totalPageCount, setTotalPageCount] = useState<number | null>(null);

  // Determine reader mode based on available data
  useEffect(() => {
    const determineMode = async () => {
      setReaderMode("loading");
      setError(null);

      // Priority 0: Picture Book with rendered images
      // Picture books use image-based rendering for optimal illustration display
      if (isPictureBook && pageImages && pageImages.count > 0) {
        setTotalPageCount(pageImages.count);
        setReaderMode("images");
        return;
      }

      // Priority 1: Native EPUB file available - use EpubReader
      // EPUB files have rich formatting, so prefer native rendering
      if (epubUrl) {
        setReaderMode("epub");
        return;
      }

      // Priority 2: Page text content from database (most recent extraction)
      if (
        pageTextContent &&
        pageTextContent.pages &&
        pageTextContent.pages.length > 0
      ) {
        setTextContent(pageTextContent as BookTextJSON);
        setTotalPageCount(
          pageTextContent.totalPages || pageTextContent.pages.length,
        );
        setReaderMode("text");
        return;
      }

      // Priority 3: Text JSON URL available - fetch from MinIO
      if (textJsonUrl && textExtractionStatus === "completed") {
        try {
          const response = await fetch(textJsonUrl);
          if (!response.ok) {
            throw new Error("Failed to load book text");
          }
          const json = (await response.json()) as BookTextJSON;

          // Validate content
          if (!json.pages || json.pages.length === 0) {
            throw new Error("Book text is empty");
          }

          setTextContent(json);
          setTotalPageCount(json.totalPages);
          setReaderMode("text");
          return;
        } catch (err) {
          console.error("Failed to load text content:", err);
          // Fall through to check other options
        }
      }

      // Priority 4: Extraction in progress
      if (textExtractionStatus === "processing") {
        setError(
          "Text extraction is in progress. Please try again in a few minutes.",
        );
        setReaderMode("error");
        return;
      }

      // Priority 5: Legacy books with rendered images
      // This handles existing books during migration
      if (pageImages && pageImages.count > 0) {
        setTotalPageCount(pageImages.count);
        setReaderMode("images");
        return;
      }

      // Priority 6: Nothing available - show error
      setError(
        "This book is not yet available for reading. Please contact your librarian.",
      );
      setReaderMode("error");
    };

    determineMode();
  }, [
    textJsonUrl,
    textExtractionStatus,
    pageImages,
    epubUrl,
    pageTextContent,
    isPictureBook,
  ]);

  // Debounced save to database
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPageRef = useRef<number>(initialPage);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      onPageChange?.(page);

      // Debounce database save - only save if page changed significantly (every 2 pages or after 3s)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(
        async () => {
          // Check if page has changed or if it's the very first load
          const isSignificantChange =
            page > lastSavedPageRef.current ||
            Math.abs(page - lastSavedPageRef.current) >= 2;

          if (isSignificantChange || page === initialPage) {
            try {
              await recordReadingProgress({ bookId, currentPage: page });
              lastSavedPageRef.current = page;

              // Check for required checkpoint quiz at or before this page
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
      ); // 3 second debounce (0.5s in test)
    },
    [bookId, onPageChange, router],
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

  // Text mode - use TextFlipReader
  if (readerMode === "text" && textContent) {
    return (
      <div className="space-y-4">
        <TextFlipReader
          textContent={textContent}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          bookTitle={bookTitle}
        />

        {/* Reader Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3">
          <div className="flex items-center gap-2 text-sm text-indigo-600">
            <span className="font-medium">📍 Page {currentPage}</span>
            <span className="text-indigo-400">of {textContent.totalPages}</span>
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              📖 Text Mode
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

  // EPUB mode - use EpubFlipReader with 3D flip animation
  if (readerMode === "epub" && epubUrl) {
    return (
      <div className="space-y-4">
        <EpubFlipReader
          epubUrl={epubUrl}
          bookTitle={bookTitle}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          onTotalPages={(count) => {
            console.log("📚 Reader reported total pages:", count);
            setTotalPageCount(count);
            updateBookTotalPages(bookId, count).catch(console.error);
          }}
        />

        {/* Reader Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3">
          <div className="flex items-center gap-2 text-sm text-indigo-600">
            <span className="font-medium">📍 Page {currentPage}</span>
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

  // Image mode - use FlipBookReader for picture books
  if (readerMode === "images" && pageImages) {
    const modeLabel = isPictureBook ? "📖 Picture Book" : "🖼️ Image Mode";

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
              {modeLabel}
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

  // Fallback - shouldn't reach here
  return null;
}
