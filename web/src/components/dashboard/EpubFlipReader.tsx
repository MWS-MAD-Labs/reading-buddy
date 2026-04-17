"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import ePub, { Book } from "epubjs";
import {
  applyReaderTheme,
  EPUB_LOCATION_BREAK_CHARS,
  getCanonicalPageFromCfi,
  getCfiFromCanonicalPage,
  getEpubLocationsCacheKey,
  getProgressPercentFromCfi,
  getReaderThemeConfig,
  normalizeTocItems,
  parseStoredLocations,
  resolveInitialEpubTarget,
  type NormalizedTocItem,
} from "@/lib/epub";
import {
  ReadingSettings,
  useReadingPreferences,
  getPreferenceClasses,
} from "./reader/ReadingSettings";
import { FullscreenReaderOverlay } from "./reader/FullscreenReaderOverlay";

import "@/styles/reader-fonts.css";
import "@/styles/reader-theme.css";

type RenditionLike = Book["rendition"];

export type EpubFlipReaderRef = {
  goToPage: (page: number) => void;
};

type EpubRelocationPayload = {
  pageNumber: number;
  totalPages: number;
  cfi: string | null;
  progressPercent: number | null;
};

type EpubFlipReaderProps = {
  bookId: number;
  epubUrl: string;
  initialPage?: number;
  initialCfi?: string | null;
  onPageChange?: (pageNumber: number) => void;
  onRelocation?: (payload: EpubRelocationPayload) => void;
  onTotalPages?: (totalPages: number) => void;
  bookTitle?: string;
};

type TouchPoint = {
  x: number;
  y: number;
};

export const EpubFlipReader = forwardRef<
  EpubFlipReaderRef,
  EpubFlipReaderProps
>(
  (
    {
      bookId,
      epubUrl,
      initialPage = 1,
      initialCfi = null,
      onPageChange,
      onRelocation,
      onTotalPages,
      bookTitle,
    },
    ref,
  ) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<RenditionLike | null>(null);
    const currentCfiRef = useRef<string | null>(null);
    const totalPagesRef = useRef(0);
    const touchStartRef = useRef<TouchPoint | null>(null);
    const readerLifecycleRef = useRef<{
      key: string;
      initializing: boolean;
    } | null>(null);
    const pendingCleanupRef = useRef<{
      key: string;
      timerId: number;
    } | null>(null);
    const initialTargetRef = useRef<{ cfi: string | null; page: number | null }>({
      cfi: initialCfi,
      page: initialPage,
    });

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showToc, setShowToc] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentPage, setCurrentPage] = useState(
      typeof initialPage === "number" ? initialPage : 1,
    );
    const [totalPages, setTotalPages] = useState(0);
    const [title, setTitle] = useState(bookTitle || "Unknown Title");
    const [author, setAuthor] = useState("Unknown Author");
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [tocItems, setTocItems] = useState<NormalizedTocItem[]>([]);

    const { preferences, updatePreferences, resetPreferences, isLoaded } =
      useReadingPreferences();

    const themeClasses = getPreferenceClasses(preferences);
    const readerTheme = useMemo(
      () => getReaderThemeConfig(preferences),
      [preferences],
    );
    const locationsCacheKey = useMemo(
      () => getEpubLocationsCacheKey(bookId),
      [bookId],
    );

    const displayTarget = useCallback(async (target?: string | number | null) => {
      if (!renditionRef.current) {
        return;
      }

      try {
        if (typeof target === "number") {
          await renditionRef.current.display(target);
        } else {
          await renditionRef.current.display(target ?? undefined);
        }
      } catch (displayError) {
        console.error("Failed to navigate EPUB", displayError);
      }
    }, []);

    const goToPage = useCallback(
      async (page: number) => {
        const book = bookRef.current;
        if (!book) {
          return;
        }

        const targetCfi = getCfiFromCanonicalPage(book, page);
        if (targetCfi) {
          await displayTarget(targetCfi);
        }
      },
      [displayTarget],
    );

    useImperativeHandle(ref, () => ({
      goToPage,
    }));

    const handleRelocated = useCallback(
      (location: {
        start?: { cfi?: string };
      }) => {
        const book = bookRef.current;
        const cfi = location?.start?.cfi ?? null;

        if (!book || !cfi) {
          return;
        }

        currentCfiRef.current = cfi;

        const canonicalPage = getCanonicalPageFromCfi(book, cfi) ?? 1;
        const progressPercent = getProgressPercentFromCfi(book, cfi);

        setCurrentPage(canonicalPage);
        onPageChange?.(canonicalPage);
        onRelocation?.({
          pageNumber: canonicalPage,
          totalPages: totalPagesRef.current,
          cfi,
          progressPercent,
        });
      },
      [onPageChange, onRelocation],
    );

    const handlePrev = useCallback(async () => {
      try {
        await renditionRef.current?.prev();
      } catch (navigationError) {
        console.error("Failed to navigate to previous EPUB page", navigationError);
      }
    }, []);

    const handleNext = useCallback(async () => {
      try {
        await renditionRef.current?.next();
      } catch (navigationError) {
        console.error("Failed to navigate to next EPUB page", navigationError);
      }
    }, []);

    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || !epubUrl) {
        return;
      }

      const readerKey = `${bookId}:${epubUrl}`;
      let cancelled = false;
      let localBook: Book | null = null;
      let localRendition: RenditionLike | null = null;

      if (pendingCleanupRef.current?.key === readerKey) {
        window.clearTimeout(pendingCleanupRef.current.timerId);
        pendingCleanupRef.current = null;
      }

      if (
        readerLifecycleRef.current?.key === readerKey &&
        (readerLifecycleRef.current.initializing ||
          bookRef.current ||
          renditionRef.current)
      ) {
        return () => {
          pendingCleanupRef.current = {
            key: readerKey,
            timerId: window.setTimeout(() => {
              cancelled = true;
              if (renditionRef.current) {
                renditionRef.current.destroy();
                renditionRef.current = null;
              }
              if (bookRef.current) {
                bookRef.current.destroy();
                bookRef.current = null;
              }
              if (readerLifecycleRef.current?.key === readerKey) {
                readerLifecycleRef.current = null;
              }
              pendingCleanupRef.current = null;
            }, 0),
          };
        };
      }

      readerLifecycleRef.current = {
        key: readerKey,
        initializing: true,
      };

      const loadBook = async () => {
        setIsLoading(true);
        setError(null);

        const response = await fetch(epubUrl, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch EPUB (${response.status})`);
        }

        const epubBuffer = await response.arrayBuffer();
        const book = ePub(epubBuffer, {
          replacements: "none",
        });
        localBook = book;
        bookRef.current = book;

        try {
          await book.ready;
          await book.opened;

          if (!(book as Book & { package?: unknown }).package) {
            (
              book as Book & {
                package?: unknown;
                packaging?: unknown;
              }
            ).package = (
              book as Book & {
                packaging?: unknown;
              }
            ).packaging;
          }

          if (cancelled) {
            return;
          }

          const metadata = await book.loaded.metadata;

          if (cancelled) {
            return;
          }

          setTitle(metadata.title || bookTitle || "Unknown Title");
          setAuthor(metadata.creator || "Unknown Author");

          try {
            const coverUrl = await book.coverUrl();
            if (!cancelled) {
              setCoverImageUrl(coverUrl || null);
            }
          } catch (coverError) {
            console.warn("Failed to load EPUB cover", coverError);
          }

          try {
            const navigation = await book.loaded.navigation;
            if (!cancelled) {
              setTocItems(normalizeTocItems(navigation?.toc || []));
            }
          } catch (navigationError) {
            console.warn("Failed to load EPUB navigation", navigationError);
            if (!cancelled) {
              setTocItems([]);
            }
          }

          const cachedLocations =
            typeof window === "undefined"
              ? null
              : parseStoredLocations(localStorage.getItem(locationsCacheKey));

          const resolvedLocations =
            cachedLocations && cachedLocations.length > 0
              ? book.locations.load(cachedLocations as unknown as string)
              : await book.locations.generate(EPUB_LOCATION_BREAK_CHARS);

          if (!cachedLocations && typeof window !== "undefined") {
            localStorage.setItem(
              locationsCacheKey,
              JSON.stringify(resolvedLocations),
            );
          }

          if (cancelled) {
            return;
          }

          totalPagesRef.current = resolvedLocations.length;
          setTotalPages(resolvedLocations.length);
          onTotalPages?.(resolvedLocations.length);

          const rendition = book.renderTo(viewer, {
            width: "100%",
            height: "100%",
            flow: "paginated",
            spread: "auto",
            minSpreadWidth: 960,
            manager: "default",
            allowScriptedContent: false,
          });

          localRendition = rendition;
          renditionRef.current = rendition;
          rendition.on("relocated", handleRelocated);

          applyReaderTheme(rendition, preferences);

          await rendition.started;

          const initialTarget = resolveInitialEpubTarget({
            initialCfi: initialTargetRef.current.cfi,
            initialPage: initialTargetRef.current.page,
            book,
          });

          await rendition.display(initialTarget || undefined);

          if (!cancelled) {
            setIsLoading(false);
          }
        } catch (loadError) {
          console.error("Failed to load EPUB", loadError);
          if (!cancelled) {
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Failed to load EPUB",
            );
            setIsLoading(false);
          }
        } finally {
          if (readerLifecycleRef.current?.key === readerKey) {
            readerLifecycleRef.current = {
              key: readerKey,
              initializing: false,
            };
          }
        }
      };

      void loadBook();

      return () => {
        pendingCleanupRef.current = {
          key: readerKey,
          timerId: window.setTimeout(() => {
            cancelled = true;

            if (localRendition) {
              localRendition.destroy();
              if (renditionRef.current === localRendition) {
                renditionRef.current = null;
              }
              localRendition = null;
            }

            if (localBook) {
              localBook.destroy();
              if (bookRef.current === localBook) {
                bookRef.current = null;
              }
              localBook = null;
            }

            if (readerLifecycleRef.current?.key === readerKey) {
              readerLifecycleRef.current = null;
            }

            pendingCleanupRef.current = null;
          }, 0),
        };
      };
    }, [
      bookId,
      bookTitle,
      epubUrl,
      handleRelocated,
      locationsCacheKey,
      onTotalPages,
    ]);

    useEffect(() => {
      if (!renditionRef.current) {
        return;
      }

      applyReaderTheme(renditionRef.current, preferences);
    }, [preferences]);

    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || typeof ResizeObserver === "undefined") {
        return;
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry || !renditionRef.current) {
          return;
        }

        const rendition = renditionRef.current as RenditionLike & {
          manager?: {
            resize: (width?: number, height?: number, epubcfi?: string) => void;
          };
        };

        if (!rendition.manager) {
          return;
        }

        try {
          rendition.resize(
            Math.floor(entry.contentRect.width),
            Math.floor(entry.contentRect.height),
          );
        } catch (resizeError) {
          console.warn("Failed to resize EPUB rendition", resizeError);
        }
      });

      observer.observe(viewer);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      const handleFullscreenChange = () => {
        const fullscreenElement =
          document.fullscreenElement ||
          (document as Document & { webkitFullscreenElement?: Element | null })
            .webkitFullscreenElement;
        setIsFullscreen(Boolean(fullscreenElement));
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );

      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener(
          "webkitfullscreenchange",
          handleFullscreenChange,
        );
      };
    }, []);

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (showSettings) {
          return;
        }

        const activeTag = (document.activeElement?.tagName || "").toLowerCase();
        if (activeTag === "input" || activeTag === "textarea") {
          return;
        }

        if (event.key === "ArrowLeft" || event.key === "PageUp") {
          event.preventDefault();
          void handlePrev();
        }

        if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
          event.preventDefault();
          void handleNext();
        }

        if (event.key === "Escape" && isFullscreen) {
          void (async () => {
            if (document.exitFullscreen) {
              await document.exitFullscreen();
            }
          })();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleNext, handlePrev, isFullscreen, showSettings]);

    const toggleFullscreen = useCallback(async () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      try {
        if (!isFullscreen) {
          if (container.requestFullscreen) {
            await container.requestFullscreen();
          } else if (
            "webkitRequestFullscreen" in container &&
            typeof (
              container as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
            ).webkitRequestFullscreen === "function"
          ) {
            await (
              container as HTMLElement & {
                webkitRequestFullscreen: () => Promise<void>;
              }
            ).webkitRequestFullscreen();
          }
        } else if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (fullscreenError) {
        console.error("Failed to toggle fullscreen", fullscreenError);
      }
    }, [isFullscreen]);

    const exitFullscreen = useCallback(async () => {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (fullscreenError) {
        console.error("Failed to exit fullscreen", fullscreenError);
      }
    }, []);

    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }, []);

    const handleTouchEnd = useCallback(
      (event: React.TouchEvent<HTMLDivElement>) => {
        const start = touchStartRef.current;
        if (!start) {
          return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = Math.abs(touch.clientY - start.y);
        touchStartRef.current = null;

        if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > deltaY) {
          if (deltaX < 0) {
            void handleNext();
          } else {
            void handlePrev();
          }
        }
      },
      [handleNext, handlePrev],
    );

    const handleTocSelect = useCallback(
      async (href: string) => {
        await displayTarget(href);
        setShowToc(false);
      },
      [displayTarget],
    );

    const adjustFontSize = useCallback(
      (delta: number) => {
        const nextSize = Math.min(200, Math.max(80, preferences.fontSize + delta));
        updatePreferences({ fontSize: nextSize });
      },
      [preferences.fontSize, updatePreferences],
    );

    const renderTocItems = useCallback(
      (items: NormalizedTocItem[]) =>
        items.map((item) => (
          <div key={item.id} className="space-y-2">
            <button
              type="button"
              onClick={() => void handleTocSelect(item.href)}
              className="w-full rounded-xl border border-transparent bg-white/70 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50"
              style={{ paddingLeft: `${12 + item.depth * 16}px` }}
            >
              {item.label}
            </button>
            {item.children.length > 0 ? renderTocItems(item.children) : null}
          </div>
        )),
      [handleTocSelect],
    );

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
            ? "fixed inset-0 z-[9999] flex flex-col overflow-hidden"
            : "space-y-4 py-6",
          themeClasses,
        )}
        style={{ backgroundColor: readerTheme.background, color: readerTheme.foreground }}
      >
        <FullscreenReaderOverlay
          isOpen={isFullscreen}
          fontSizePercent={preferences.fontSize}
          onDecreaseFontSize={() => adjustFontSize(-10)}
          onIncreaseFontSize={() => adjustFontSize(10)}
          onOpenSettings={() => setShowSettings(true)}
          onExitFullscreen={() => void exitFullscreen()}
        />

        {!isFullscreen && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-100 bg-white/80 p-3 shadow-sm">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-indigo-900">{title}</p>
              <p className="truncate text-xs text-indigo-500">{author}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handlePrev()}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                ◀ Prev
              </button>
              <button
                type="button"
                onClick={() => void handleNext()}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Next ▶
              </button>
              <button
                type="button"
                onClick={() => setShowToc((open) => !open)}
                className="rounded-lg border border-emerald-300 bg-emerald-100 px-2 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200"
              >
                ☰ TOC
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-lg border border-violet-300 bg-violet-100 px-2 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-200"
              >
                ⚙️ Aa
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className="rounded-lg border border-indigo-300 bg-indigo-100 px-2 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-200"
              >
                ⛶ Full
              </button>
            </div>
          </div>
        )}

        <div
          className={clsx(
            "relative mx-auto flex w-full gap-4",
            isFullscreen ? "min-h-0 flex-1 px-3 pb-3 pt-14 sm:px-4 sm:pb-4" : "",
          )}
        >
          {showToc && (
            <aside
              className={clsx(
                "w-full max-w-xs shrink-0 overflow-y-auto rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-xl",
                isFullscreen ? "max-h-full" : "max-h-[720px]",
              )}
            >
              <div className="mb-4 flex items-start gap-3">
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt={`Cover of ${title}`}
                    className="h-20 w-14 rounded-xl object-cover shadow-md"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold text-slate-900">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">{author}</p>
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Page {currentPage} of {Math.max(totalPages, 1)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {tocItems.length > 0 ? (
                  renderTocItems(tocItems)
                ) : (
                  <p className="text-sm text-slate-500">No table of contents found.</p>
                )}
              </div>
            </aside>
          )}

          <div
            className={clsx(
              "relative flex-1 overflow-hidden rounded-[2rem] border shadow-2xl",
              isFullscreen ? "min-h-0" : "min-h-[720px]",
            )}
            style={{
              background:
                preferences.theme === "dark"
                  ? "linear-gradient(180deg, #202024 0%, #16161a 100%)"
                  : "linear-gradient(180deg, #fffdf8 0%, #f7f1e5 100%)",
              borderColor:
                preferences.theme === "dark" ? "rgba(255,255,255,0.08)" : "#e6dcc7",
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {(isLoading || !isLoaded) && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
                <p className="text-lg font-semibold text-purple-600">Opening EPUB...</p>
                <p className="text-sm text-purple-400">
                  Building stable reading locations and loading chapters.
                </p>
              </div>
            )}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black/10 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black/10 to-transparent" />
            <button
              type="button"
              onClick={() => void handlePrev()}
              className="absolute inset-y-0 left-0 z-20 w-1/6 min-w-12"
              aria-label="Previous page"
            />
            <button
              type="button"
              onClick={() => void handleNext()}
              className="absolute inset-y-0 right-0 z-20 w-1/6 min-w-12"
              aria-label="Next page"
            />
            <div className="absolute inset-0 px-6 py-8 sm:px-10 sm:py-10">
              <div
                ref={viewerRef}
                className="h-full w-full overflow-hidden rounded-[1.5rem] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]"
              />
            </div>
          </div>
        </div>

        <ReadingSettings
          preferences={preferences}
          onUpdate={updatePreferences}
          onReset={resetPreferences}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {!isFullscreen && totalPages > 0 && (
          <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-indigo-600">
                Page{" "}
                <span className="font-semibold text-indigo-900">
                  {currentPage}
                </span>{" "}
                of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
                <p className="text-xs font-semibold text-emerald-700">
                  EPUB Paginated Mode
                </p>
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{
                  width: `${Math.max(0, currentPage / Math.max(totalPages, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);

EpubFlipReader.displayName = "EpubFlipReader";
