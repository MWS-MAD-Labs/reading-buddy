"use client";

/**
 * EPUB Flip Reader Component
 * Parses EPUB files and renders with 3D flip animation using react-pageflip
 * Features premium visual styling: realistic paper, spine, shadows, and covers.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import ePub, { Book } from "epubjs";
import {
  useReadingPreferences,
  getPreferenceClasses,
  getPreferenceStyles,
  ReadingSettings,
} from "./reader/ReadingSettings";
import { FullscreenReaderOverlay } from "./reader/FullscreenReaderOverlay";

// Import reader fonts and theme CSS
import "@/styles/reader-fonts.css";
import "@/styles/reader-theme.css";

export type EpubFlipReaderRef = {
  goToPage: (page: number) => void;
};

type EpubFlipReaderProps = {
  epubUrl: string;
  initialPage?: number;
  onPageChange?: (pageNumber: number) => void;
  onTotalPages?: (totalPages: number) => void;
  bookTitle?: string;
};

type ParsedPage = {
  type: "cover" | "content" | "back-cover";
  pageNumber: number;
  content?: string;
  chapterTitle?: string;
  isChapterStart?: boolean;
};

const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

// Approximate characters per page (reduced for better margins/readability)
const CHARS_PER_PAGE = 1500;

export const EpubFlipReader = forwardRef<
  EpubFlipReaderRef,
  EpubFlipReaderProps
>(({ epubUrl, initialPage = 1, onPageChange, onTotalPages, bookTitle }, ref) => {
  // Generate storage key from epub URL
  const storageKey = `epub-page-${epubUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(-50)}`;

  const [pages, setPages] = useState<ParsedPage[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  // Ensure initialPage is treated as a number
  const basePage =
    typeof initialPage === "string"
      ? parseInt(initialPage, 10)
      : initialPage || 0;
  const [currentPage, setCurrentPage] = useState(basePage);

  console.log("📖 EpubFlipReader mount:", {
    basePage,
    initialPage,
    epubUrl,
    storageKey,
  });
  const [jumpToPage, setJumpToPage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const epubBookRef = useRef<Book | null>(null);

  // Load saved page from localStorage on mount
  const savedPageRef = useRef<number | null>(null);
  if (savedPageRef.current === null && typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(storageKey);
      const localSaved = saved ? parseInt(saved, 10) : 0;
      // Only fallback to localStorage if DB value is 0 (first page/new book)
      const dbValue =
        typeof initialPage === "string"
          ? parseInt(initialPage, 10)
          : initialPage;
      savedPageRef.current = dbValue > 0 ? dbValue : localSaved;
      console.log("💾 Loaded saved page:", {
        dbValue,
        localSaved,
        final: savedPageRef.current,
      });
    } catch {
      savedPageRef.current =
        typeof initialPage === "string"
          ? parseInt(initialPage, 10)
          : initialPage;
    }
  }
  // Track last page to restore after settings-triggered re-render
  const lastPageRef = useRef<number>(savedPageRef.current ?? initialPage);

  const { preferences, updatePreferences, resetPreferences, isLoaded } =
    useReadingPreferences();

  // Parse EPUB and extract text content
  useEffect(() => {
    const parseEpub = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const book = ePub(epubUrl);
        epubBookRef.current = book;

        await book.ready;

        // Get metadata
        const metadata = await book.loaded.metadata;
        const title = metadata.title || bookTitle || "Unknown Title";
        const author = metadata.creator || "Unknown Author";

        // Get spine items (chapters)
        const spine = book.spine;
        const allText: { text: string; title?: string }[] = [];

        // Iterate through spine items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const item of (spine as any).items) {
          try {
            const doc = await book.load(item.href);
            if (doc && typeof doc === "object" && "body" in doc) {
              const body = (doc as Document).body;
              const text = body?.textContent?.trim() || "";
              if (text) {
                // Try to get chapter title from TOC
                const toc = await book.loaded.navigation;
                const tocItem = toc.toc.find((t) => t.href.includes(item.href));
                allText.push({
                  text,
                  title: tocItem?.label,
                });
              }
            }
          } catch (e) {
            console.warn(`Failed to load chapter: ${item.href}`, e);
          }
        }

        // Build pages array
        const finalPages: ParsedPage[] = [];
        let pageCounter = 0; // 0-indexed internally

        // 1. Cover Page (Page 0)
        finalPages.push({
          type: "cover",
          pageNumber: 0,
          content: JSON.stringify({ title, author }),
        });
        pageCounter++;

        // 2. Content Pages
        for (const chapter of allText) {
          let remainingText = chapter.text;
          let isFirstPageOfChapter = true;

          while (remainingText.length > 0) {
            // Find a good break point
            let breakPoint = CHARS_PER_PAGE;

            if (remainingText.length > CHARS_PER_PAGE) {
              // Try paragraph break
              const paragraphBreak = remainingText.lastIndexOf(
                "\n\n",
                CHARS_PER_PAGE,
              );
              if (paragraphBreak > CHARS_PER_PAGE * 0.5) {
                breakPoint = paragraphBreak + 2;
              } else {
                // Try sentence break
                const sentenceBreak = remainingText.lastIndexOf(
                  ". ",
                  CHARS_PER_PAGE,
                );
                if (sentenceBreak > CHARS_PER_PAGE * 0.5) {
                  breakPoint = sentenceBreak + 2;
                } else {
                  // Try word break
                  const wordBreak = remainingText.lastIndexOf(
                    " ",
                    CHARS_PER_PAGE,
                  );
                  if (wordBreak > CHARS_PER_PAGE * 0.5) {
                    breakPoint = wordBreak + 1;
                  }
                }
              }
            } else {
              breakPoint = remainingText.length;
            }

            const pageText = remainingText.slice(0, breakPoint).trim();
            remainingText = remainingText.slice(breakPoint).trim();

            if (pageText) {
              finalPages.push({
                type: "content",
                pageNumber: pageCounter,
                content: pageText,
                chapterTitle: isFirstPageOfChapter ? chapter.title : undefined,
                isChapterStart: isFirstPageOfChapter,
              });
              pageCounter++;
              isFirstPageOfChapter = false;
            }
          }
        }

        // 3. Back Cover
        finalPages.push({
          type: "back-cover",
          pageNumber: pageCounter,
        });

        if (finalPages.length <= 2) {
          // Only covers
          throw new Error("No readable content found in EPUB");
        }

        setPages(finalPages);
        setTotalPages(finalPages.length);
        setIsLoading(false);
        onTotalPages?.(finalPages.length);
      } catch (err) {
        console.error("Error parsing EPUB:", err);
        setError(err instanceof Error ? err.message : "Failed to parse EPUB");
        setIsLoading(false);
      }
    };

    if (epubUrl) {
      parseEpub();
    }

    return () => {
      if (epubBookRef.current) {
        epubBookRef.current.destroy();
      }
    };
  }, [epubUrl, bookTitle]);

  // Define goToPage first
  const goToPageHandler = useCallback(
    (page: number) => {
      // Adjust for 0-indexed pages (cover is 0)
      // User input '1' should map to first content page (index 1) if possible
      // Detailed logic:
      // Internal pages: 0 (Cover), 1 (Content 1), 2 (Content 2)...
      // We want user-facing "Page 1" to be Content 1 (Index 1)

      let targetIndex = page;
      if (page === 1) targetIndex = 1; // Go to first content page

      targetIndex = Math.min(totalPages - 1, Math.max(0, targetIndex));

      if (bookRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (bookRef.current as any).pageFlip().flip(targetIndex);
      }
    },
    [totalPages],
  );

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    goToPage: goToPageHandler,
  }));

  // Detect screen orientation and size
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const mobile = window.innerWidth < 768;
      setIsPortrait(portrait);
      setIsMobile(mobile);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).webkitFullscreenElement,
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const handleFlip = useCallback(
    (pageIndex: number) => {
      setCurrentPage(pageIndex);
      lastPageRef.current = pageIndex; // Track for settings reload
      // Save to localStorage for persistence across reloads
      try {
        localStorage.setItem(storageKey, String(pageIndex));
      } catch {
        /* ignore storage errors */
      }
      onPageChange?.(pageIndex);
    },
    [onPageChange, storageKey],
  );

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPage, 10);
    if (!isNaN(pageNum)) {
      goToPageHandler(pageNum);
      setJumpToPage("");
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
    }
  };

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void exitFullscreen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen, exitFullscreen]);

  const adjustFontSize = useCallback(
    (delta: number) => {
      const next = Math.min(200, Math.max(80, preferences.fontSize + delta));
      updatePreferences({ fontSize: next });
    },
    [preferences.fontSize, updatePreferences],
  );

  // Calculate dimensions - Larger and more book-like
  const getResponsiveDimensions = () => {
    const viewportWidth =
      typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewportHeight =
      typeof window !== "undefined" ? window.innerHeight : 768;

    if (isFullscreen) {
      const padding = 0; // fullscreen should be edge-to-edge
      const availableWidth = Math.max(320, viewportWidth - padding);
      const availableHeight = Math.max(320, viewportHeight - padding);
      const usePortraitLayout = viewportHeight > viewportWidth;

      return usePortraitLayout
        ? { baseWidth: availableWidth, baseHeight: availableHeight }
        : { baseWidth: availableWidth / 2, baseHeight: availableHeight };
    }

    if (isMobile && isPortrait) {
      const availableWidth = viewportWidth - 30;
      return {
        baseWidth: availableWidth,
        baseHeight: availableWidth * 1.5,
      };
    }

    // Desktop default size - Make it look like a substantial book
    return { baseWidth: 500, baseHeight: 720 };
  };

  const { baseWidth, baseHeight } = getResponsiveDimensions();
  const width = Math.round(baseWidth);
  const height = Math.round(baseHeight);

  // Prefer explicit font size controls over auto-scaling in fullscreen.
  const scaleFactor = 1;

  // Navigate to saved page on initial load or after settings change
  useEffect(() => {
    if (bookRef.current && pages.length > 0) {
      // Priority: lastPageRef (session) > savedPageRef (mount) > initialPage (DB)
      const targetPage =
        lastPageRef.current || savedPageRef.current || initialPage;
      const targetIndex = Math.round(targetPage);

      console.log("🎯 Attempting navigation to:", {
        targetPage,
        targetIndex,
        pagesCount: pages.length,
      });

      if (targetIndex >= 0) {
        const timer = setTimeout(() => {
          if (bookRef.current) {
            console.log("🚀 Flipping to:", targetIndex);
            bookRef.current.pageFlip().flip(targetIndex);
            lastPageRef.current = targetIndex;
            setCurrentPage(targetIndex);
          }
        }, 500); // Slightly longer timeout
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length, preferences.fontSize, preferences.theme]);

  const themeClasses = getPreferenceClasses(preferences);
  const themeStyles = getPreferenceStyles(preferences, scaleFactor);

  // Loading state
  if (isLoading || !isLoaded) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
        <p className="text-lg font-semibold text-purple-600">Binding book...</p>
        <p className="text-sm text-purple-400">Preparing pages & cover...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-red-200 bg-red-50 p-8 text-center">
        <div className="text-4xl">⚠️</div>
        <h3 className="text-xl font-bold text-red-800">Error Loading Book</h3>
        <p className="max-w-md text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        isFullscreen
          ? "fixed inset-0 z-[9999] overflow-hidden flex flex-col"
          : "book-container space-y-4 py-8", // 3D perspective in non-fullscreen
        themeClasses,
      )}
      style={isFullscreen ? { backgroundColor: "var(--reader-bg)" } : undefined}
    >
      <FullscreenReaderOverlay
        isOpen={isFullscreen}
        fontSizePercent={preferences.fontSize}
        onDecreaseFontSize={() => adjustFontSize(-10)}
        onIncreaseFontSize={() => adjustFontSize(10)}
        onOpenSettings={() => setShowSettings(true)}
        onExitFullscreen={() => void exitFullscreen()}
      />

      {/* Navigation Controls */}
      {!isFullscreen && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-2 shadow-sm">
          <div className="flex items-center gap-1">
            {/* Navigation Buttons... (Same as before but cleaner) */}
            <button
              onClick={() => goToPageHandler(0)}
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-600"
            >
              Cover
            </button>
            <button
              onClick={() => goToPageHandler(currentPage - 2)}
              disabled={currentPage <= 0}
              className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              ◀ Prev
            </button>
            <button
              onClick={() => goToPageHandler(currentPage + 2)}
              disabled={currentPage >= totalPages - 1}
              className="rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-gray-500 mr-2">
              {currentPage === 0
                ? "Cover"
                : `Pages ${currentPage}-${currentPage + 1}`}
            </div>
            <button
              onClick={toggleFullscreen}
              className="rounded-lg border border-indigo-300 bg-indigo-100 px-2 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-200"
            >
              ⛶ Full
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-lg border border-violet-300 bg-violet-100 px-2 py-1.5 text-xs font-bold text-violet-600 hover:bg-violet-200"
            >
              ⚙️ Aa
            </button>
          </div>
        </div>
      )}

      {/* Flip Book Wrapper */}
      <div
        className={clsx(
          "relative mx-auto transition-all duration-500",
          isFullscreen
            ? "flex-1 min-h-0 flex items-center justify-center"
            : "p-4",
        )}
      >
        <HTMLFlipBook
          key={`epub-${isFullscreen ? "fs" : "normal"}-${width}x${height}-${preferences.fontSize}-${preferences.theme}`}
          ref={bookRef}
          width={width}
          height={height}
          size={isFullscreen || (isMobile && isPortrait) ? "fixed" : "stretch"}
          minWidth={Math.round(baseWidth * 0.6)}
          maxWidth={Math.round(baseWidth * 2)}
          minHeight={Math.round(baseHeight * 0.6)}
          maxHeight={Math.round(baseHeight * 2)}
          drawShadow={true}
          flippingTime={800}
          usePortrait={
            isFullscreen
              ? typeof window !== "undefined"
                ? window.innerHeight > window.innerWidth
                : false
              : isMobile && isPortrait
          }
          startZIndex={0}
          autoSize={isFullscreen || (isMobile && isPortrait) ? false : true}
          maxShadowOpacity={0.4}
          showCover={true}
          mobileScrollSupport={true}
          clickEventForward={false}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          startPage={currentPage}
          onFlip={(event: { data: number }) => {
            console.log("📖 Page flipped to:", event.data);
            handleFlip(event.data);
          }}
          className={clsx("mx-auto", !isFullscreen && "shadow-2xl")}
          style={{}}
        >
          {pages.map((page, index) => {
            if (index === 0 && page.type === "cover") {
              const meta = JSON.parse(page.content || "{}");
              return (
                <div key={`cover-${index}`} className="book-cover">
                  <div className="cover-title">{meta.title}</div>
                  <div className="cover-author">{meta.author}</div>
                </div>
              );
            }

            if (page.type === "back-cover") {
              return (
                <div key={`back-${index}`} className="book-cover">
                  <div className="text-white/50 text-sm mt-auto mb-8">
                    End of Book
                  </div>
                </div>
              );
            }

            return (
              <article
                key={`page-${page.pageNumber}`}
                className={clsx(
                  "reader-page-card reader-content",
                  index % 2 === 0 ? "reader-page-card--left" : "",
                  page.isChapterStart ? "chapter-start" : "",
                  themeClasses,
                )}
              >
                <div
                  className="reader-page-content overflow-y-auto px-4 py-2"
                  style={themeStyles}
                >
                  {/* Chapter Title (if start) */}
                  {page.chapterTitle && page.isChapterStart && (
                    <div className="mb-4 text-center">
                      <h2 className="font-serif font-bold text-lg mb-1">
                        {page.chapterTitle}
                      </h2>
                      <div className="w-12 h-0.5 bg-current opacity-30 mx-auto"></div>
                    </div>
                  )}

                  {/* Text Content */}
                  <div className="leading-relaxed">
                    {page.content?.split("\n\n").map((paragraph, pIdx) => (
                      <p key={pIdx} className="mb-4 text-justify">
                        {paragraph.split("\n").map((line, lIdx) => (
                          <span key={lIdx}>
                            {line}
                            {lIdx < paragraph.split("\n").length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="reader-page-number">{page.pageNumber}</div>
              </article>
            );
          })}
        </HTMLFlipBook>
      </div>

      {/* Reading Settings Modal */}
      <ReadingSettings
        preferences={preferences}
        onUpdate={updatePreferences}
        onReset={resetPreferences}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Progress Bar - Hidden in fullscreen */}
      {!isFullscreen && totalPages > 0 && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-indigo-600">
              Page{" "}
              <span className="font-semibold text-indigo-900">
                {currentPage}
              </span>{" "}
              of {totalPages - 2} {/* Subtract cover and back cover */}
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-xs font-semibold text-emerald-700">
                EPUB Mode
              </p>
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
              style={{
                width: `${Math.max(0, currentPage / Math.max(1, totalPages - 2)) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
});

EpubFlipReader.displayName = "EpubFlipReader";
