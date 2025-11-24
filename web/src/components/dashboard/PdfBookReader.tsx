"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  evaluateAchievements,
  recordReadingProgress,
} from "@/app/(dashboard)/dashboard/student/actions";

type ReactPDFModule = typeof import("react-pdf");

type PdfBookReaderProps = {
  bookId: number;
  pdfUrl: string;
  initialPage?: number;
  expectedPages?: number | null;
};

const workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const DISPLAY_MODES = {
  SPREAD: "spread",
  SINGLE: "single",
} as const;

type DisplayMode = (typeof DISPLAY_MODES)[keyof typeof DISPLAY_MODES];

export const PdfBookReader = ({
  bookId,
  pdfUrl,
  initialPage = 1,
  expectedPages,
}: PdfBookReaderProps) => {
  const [reactPdf, setReactPdf] = useState<ReactPDFModule | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [basePageWidth, setBasePageWidth] = useState(360);
  const [flipDirection, setFlipDirection] = useState<"forward" | "backward">(
    "forward",
  );
  const [flipAnimationId, setFlipAnimationId] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    DISPLAY_MODES.SPREAD,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [zoom, setZoom] = useState(1);
  const achievementAwardedRef = useRef(false);
  const bookContainerRef = useRef<HTMLDivElement | null>(null);

  const normalizedPage = useMemo(() => {
    if (!numPages) return Math.max(currentPage, 1);
    return Math.min(Math.max(currentPage, 1), numPages);
  }, [currentPage, numPages]);

  const pageSpread = useMemo(() => {
    const rawLeft =
      displayMode === DISPLAY_MODES.SPREAD && normalizedPage > 1
        ? normalizedPage % 2 === 0
          ? normalizedPage - 1
          : normalizedPage
        : normalizedPage;
    const leftPage = Math.max(rawLeft, 1);
    const rightCandidate = leftPage + 1;
    const rightPage =
      displayMode === DISPLAY_MODES.SPREAD &&
      numPages &&
      rightCandidate <= numPages
        ? rightCandidate
        : null;

    return { leftPage, rightPage };
  }, [normalizedPage, numPages, displayMode]);

  const lastVisiblePage =
    displayMode === DISPLAY_MODES.SPREAD
      ? (pageSpread.rightPage ?? pageSpread.leftPage)
      : pageSpread.leftPage;
  const pageIncrement = displayMode === DISPLAY_MODES.SPREAD ? 2 : 1;
  const effectivePageWidth = Math.round(basePageWidth * zoom);
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  useEffect(() => {
    if (!numPages || !lastVisiblePage) {
      return;
    }
    const timeout = setTimeout(() => {
      setStatus("saving");
      recordReadingProgress({ bookId, currentPage: lastVisiblePage })
        .catch((err) => {
          console.error(err);
          setError("Unable to save progress automatically.");
        })
        .finally(() => setStatus("idle"));
    }, 1200);

    return () => clearTimeout(timeout);
  }, [bookId, lastVisiblePage, numPages]);

  useEffect(() => {
    const target = expectedPages ?? numPages;
    if (!target || lastVisiblePage < target || achievementAwardedRef.current) {
      return;
    }

    achievementAwardedRef.current = true;
    evaluateAchievements().catch((err) => console.error(err));
  }, [lastVisiblePage, expectedPages, numPages]);

  useEffect(() => {
    achievementAwardedRef.current = false;
  }, [bookId]);

  const handleLoadSuccess = (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
  };

  const goToPage = (page: number) => {
    setHasInteracted(true);
    setFlipDirection(page >= normalizedPage ? "forward" : "backward");
    setFlipAnimationId((id) => (id + 1) % 2);
    setCurrentPage(() => {
      if (!numPages) {
        return Math.max(page, 1);
      }

      return Math.min(Math.max(page, 1), numPages);
    });
  };

  useEffect(() => {
    let isMounted = true;

    import("react-pdf")
      .then((module) => {
        if (!isMounted) {
          return;
        }

        if (typeof window !== "undefined") {
          module.pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        }

        setReactPdf(module);
      })
      .catch((err) => {
        console.error(err);
        setError("Unable to load the PDF viewer.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !bookContainerRef.current) {
      return;
    }

    const target = bookContainerRef.current;
    const updateWidth = (containerWidth: number) => {
      const columns = displayMode === DISPLAY_MODES.SPREAD ? 2 : 1;
      const gutter = columns === 2 ? 32 : 24;
      const maxWidth = columns === 2 ? 420 : 560;
      const computedWidth = Math.max(
        220,
        Math.min(maxWidth, Math.floor(containerWidth / columns) - gutter),
      );
      setBasePageWidth(computedWidth);
    };

    const observer = new ResizeObserver(([entry]) => {
      updateWidth(entry.contentRect.width);
    });

    observer.observe(target);
    updateWidth(target.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [displayMode]);

  useEffect(() => {
    if (displayMode === DISPLAY_MODES.SPREAD && normalizedPage % 2 === 0) {
      setCurrentPage((page) => Math.max(page - 1, 1));
    }
  }, [displayMode, normalizedPage]);

  const adjustZoom = (delta: number) => {
    setZoom((value) => {
      const next = Math.min(
        1.8,
        Math.max(0.6, parseFloat((value + delta).toFixed(2))),
      );
      return next;
    });
  };

  const turnForward = () => {
    if (!numPages || lastVisiblePage >= numPages) return;
    goToPage(pageSpread.leftPage + pageIncrement);
  };

  const turnBackward = () => {
    if (pageSpread.leftPage <= 1) return;
    const previousTarget = Math.max(pageSpread.leftPage - pageIncrement, 1);
    goToPage(previousTarget);
  };

  const handleSpreadClick = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - bounds.left;
    const clickY = event.clientY - bounds.top;
    const isColumnLayout =
      bounds.width < 600 || bounds.height > bounds.width * 1.4;

    if (isColumnLayout) {
      if (clickY > bounds.height / 2) {
        turnForward();
      } else {
        turnBackward();
      }
      return;
    }

    if (clickX > bounds.width / 2) {
      turnForward();
    } else {
      turnBackward();
    }
  };

  const DocumentComponent = reactPdf?.Document;
  const PageComponent = reactPdf?.Page;
  const reachedBookStart = pageSpread.leftPage <= 1;
  const reachedBookEnd = Boolean(numPages) && lastVisiblePage >= numPages;
  const spreadAnimationClass = hasInteracted
    ? flipDirection === "forward"
      ? flipAnimationId === 0
        ? "book-spread--forward-a"
        : "book-spread--forward-b"
      : flipAnimationId === 0
        ? "book-spread--backward-a"
        : "book-spread--backward-b"
    : null;

  return (
    <div className="pop-in space-y-4 rounded-3xl border-4 border-purple-300 bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-4 shadow-2xl md:space-y-5 md:p-8">
      {/* Mobile Controls */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => turnBackward()}
            disabled={reachedBookStart}
            className="btn-3d btn-squish min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-blue-300 bg-blue-100 px-4 py-3 text-base font-black text-blue-600 transition hover:bg-blue-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            ⬅️ Back
          </button>
          <span className="min-h-[44px] flex-1 rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 text-center text-sm font-black">
            📄 {displayMode === DISPLAY_MODES.SPREAD ? "Pages " : "Page "}
            {pageSpread.leftPage}
            {displayMode === DISPLAY_MODES.SPREAD && pageSpread.rightPage
              ? `-${pageSpread.rightPage}`
              : ""}
            {numPages ? ` / ${numPages}` : null}
          </span>
          <button
            type="button"
            onClick={() => turnForward()}
            disabled={reachedBookEnd}
            className="btn-3d btn-squish min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-pink-300 bg-gradient-to-r from-pink-400 to-rose-400 px-4 py-3 text-base font-black text-white shadow-sm transition hover:from-pink-500 hover:to-rose-500 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            Next ➡️
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings((value) => !value)}
          className="btn-3d btn-squish min-h-[44px] w-full rounded-2xl border-4 border-violet-300 bg-violet-100 px-4 py-3 text-base font-black text-violet-600 transition hover:bg-violet-200 active:scale-95"
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Desktop Controls */}
      <div className="hidden flex-wrap items-center gap-4 lg:flex">
        <div className="flex items-center gap-3 text-lg font-black text-purple-900">
          <button
            type="button"
            onClick={() => turnBackward()}
            disabled={reachedBookStart}
            className="btn-3d btn-squish min-h-[44px] rounded-2xl border-4 border-blue-300 bg-blue-100 px-5 py-2 text-blue-600 transition hover:bg-blue-200 disabled:pointer-events-none disabled:opacity-40"
          >
            ⬅️ Back
          </button>
          <span className="min-h-[44px] rounded-2xl border-4 border-purple-300 bg-white px-5 py-2 text-base">
            📄 {displayMode === DISPLAY_MODES.SPREAD ? "Pages " : "Page "}
            {pageSpread.leftPage}
            {displayMode === DISPLAY_MODES.SPREAD && pageSpread.rightPage
              ? `-${pageSpread.rightPage}`
              : ""}
            {numPages ? ` / ${numPages}` : null}
          </span>
          <button
            type="button"
            onClick={() => turnForward()}
            disabled={reachedBookEnd}
            className="btn-3d btn-squish min-h-[44px] rounded-2xl border-4 border-pink-300 bg-gradient-to-r from-pink-400 to-rose-400 px-5 py-2 font-black text-white shadow-sm transition hover:from-pink-500 hover:to-rose-500 disabled:pointer-events-none disabled:opacity-40"
          >
            Next ➡️
          </button>
        </div>
        <div className="relative ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((value) => !value)}
            className="btn-3d btn-squish min-h-[44px] rounded-2xl border-4 border-violet-300 bg-violet-100 px-4 py-2 text-base font-black text-violet-600 transition hover:bg-violet-200"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="pop-in space-y-4 rounded-2xl border-4 border-yellow-300 bg-yellow-50 p-4 shadow-inner md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-3">
              <span className="text-base font-black text-yellow-700">
                🔍 Zoom
              </span>
              <div className="flex flex-1 items-center gap-2 sm:flex-initial">
                <button
                  type="button"
                  onClick={() => adjustZoom(-0.1)}
                  className="btn-3d btn-squish min-h-[44px] min-w-[44px] rounded-2xl border-4 border-orange-300 bg-white px-4 py-2 text-xl font-black leading-none text-orange-600 hover:bg-orange-50 active:scale-95"
                >
                  –
                </button>
                <span className="min-h-[44px] w-16 rounded-2xl border-4 border-yellow-300 bg-white px-3 py-2 text-center text-base font-black text-yellow-700">
                  {zoomLabel}
                </span>
                <button
                  type="button"
                  onClick={() => adjustZoom(0.1)}
                  className="btn-3d btn-squish min-h-[44px] min-w-[44px] rounded-2xl border-4 border-orange-300 bg-white px-4 py-2 text-xl font-black leading-none text-orange-600 hover:bg-orange-50 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-base font-black text-yellow-700">
                📖 Layout
              </span>
              <div className="flex gap-2 rounded-2xl border-4 border-yellow-300 bg-white p-2">
                <button
                  type="button"
                  onClick={() => setDisplayMode(DISPLAY_MODES.SINGLE)}
                  className={clsx(
                    "btn-squish min-h-[44px] flex-1 rounded-xl px-4 py-2 text-sm font-black transition active:scale-95 sm:flex-initial",
                    displayMode === DISPLAY_MODES.SINGLE
                      ? "bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-md"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  📄 Single
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode(DISPLAY_MODES.SPREAD)}
                  className={clsx(
                    "btn-squish min-h-[44px] flex-1 rounded-xl px-4 py-2 text-sm font-black transition active:scale-95 sm:flex-initial",
                    displayMode === DISPLAY_MODES.SPREAD
                      ? "bg-gradient-to-r from-rose-400 to-orange-400 text-white shadow-md"
                      : "bg-gray-100 text-gray-600",
                  )}
                >
                  📖 Spread
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <div className="rounded-2xl border-4 border-green-300 bg-green-50 px-4 py-2 text-base font-bold text-green-600">
          {status === "saving"
            ? "💾 Saving progress…"
            : "✅ Progress auto-saves!"}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border-4 border-red-300 bg-red-50 px-4 py-3">
          <p className="text-center text-base font-bold text-red-600">
            ⚠️ {error}
          </p>
        </div>
      ) : null}

      <div
        ref={bookContainerRef}
        className="book-viewer relative flex justify-center overflow-hidden rounded-3xl border-4 border-purple-400 bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200 shadow-2xl"
        onClick={handleSpreadClick}
        role="presentation"
      >
        {DocumentComponent && PageComponent ? (
          <DocumentComponent
            file={pdfUrl}
            className={clsx(
              "book-spread",
              spreadAnimationClass,
              !pageSpread.rightPage && "book-spread--single",
            )}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={(err: Error) => setError(err.message)}
            loading={
              <div className="p-8 text-xl font-black text-purple-900">
                📚 Loading your book...
              </div>
            }
          >
            <PageComponent
              className="book-page book-page--left"
              pageNumber={pageSpread.leftPage}
              width={effectivePageWidth}
              renderAnnotationLayer
              renderTextLayer
            />
            {pageSpread.rightPage ? (
              <PageComponent
                className="book-page book-page--right"
                pageNumber={pageSpread.rightPage}
                width={effectivePageWidth}
                renderAnnotationLayer
                renderTextLayer
              />
            ) : null}
          </DocumentComponent>
        ) : (
          <div className="p-8 text-xl font-black text-purple-900">
            🎨 Preparing your reader...
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            turnBackward();
          }}
          disabled={reachedBookStart}
          className="book-hotspot book-hotspot--left"
          aria-label="Previous pages"
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            turnForward();
          }}
          disabled={reachedBookEnd}
          className="book-hotspot book-hotspot--right"
          aria-label="Next pages"
        />
      </div>
    </div>
  );
};
