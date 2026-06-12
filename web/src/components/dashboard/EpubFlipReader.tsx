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
  rewriteArchivedSectionAssetUrls,
  resolveInitialEpubTarget,
  type NormalizedTocItem,
} from "@/lib/epub";
import {
  ReadingSettings,
  useReadingPreferences,
  getPreferenceClasses,
} from "./reader/ReadingSettings";
import { FullscreenReaderOverlay } from "./reader/FullscreenReaderOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import "@/styles/reader-fonts.css";
import "@/styles/reader-theme.css";
import "@/styles/reader-flip.css";

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

type FlipOverlayBar = {
  top: string;
  left: string;
  width: string;
  height: string;
  opacity: number;
};

type FlipOverlayState = {
  direction: "next" | "prev";
  bars: FlipOverlayBar[];
};

const FLIP_DURATION_MS = 900;

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
    const currentPageRef = useRef(
      typeof initialPage === "number" ? initialPage : 1,
    );
    const locationsReadyRef = useRef(false);
    const totalPagesRef = useRef(0);
    const touchStartRef = useRef<TouchPoint | null>(null);
    const flipStageRef = useRef<HTMLDivElement>(null);
    const lastNavDirectionRef = useRef<"next" | "prev" | null>(null);
    const flipTimeoutRef = useRef<number | null>(null);
    const pendingNavTimerRef = useRef<number | null>(null);
    const isFlipAnimatingRef = useRef(false);
    const readerLifecycleRef = useRef<{
      key: string;
      initializing: boolean;
    } | null>(null);
    const pendingCleanupRef = useRef<{
      key: string;
      timerId: number;
    } | null>(null);
    const initialTargetRef = useRef<{
      cfi: string | null;
      page: number | null;
    }>({
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
    const [flipOverlay, setFlipOverlay] = useState<FlipOverlayState | null>(
      null,
    );

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

    const displayTarget = useCallback(
      async (target?: string | number | null) => {
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
      },
      [],
    );

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

    const syncRelocationState = useCallback(
      (cfi: string) => {
        const book = bookRef.current;
        let canonicalPage = currentPageRef.current;
        let progressPercent: number | null = null;

        currentCfiRef.current = cfi;

        if (book && locationsReadyRef.current) {
          canonicalPage = getCanonicalPageFromCfi(book, cfi) ?? canonicalPage;
          progressPercent = getProgressPercentFromCfi(book, cfi);
        } else if (
          initialTargetRef.current.cfi === cfi &&
          initialTargetRef.current.page
        ) {
          canonicalPage = initialTargetRef.current.page;
        }

        currentPageRef.current = canonicalPage;
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

    const buildFallbackOverlayBars = useCallback((): FlipOverlayBar[] => {
      return [
        { top: "10%", left: "9%", width: "78%", height: "2.2%", opacity: 0.2 },
        { top: "16%", left: "9%", width: "80%", height: "1.8%", opacity: 0.16 },
        { top: "20%", left: "9%", width: "80%", height: "1.8%", opacity: 0.16 },
        { top: "24%", left: "9%", width: "80%", height: "1.8%", opacity: 0.16 },
        { top: "31%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
        { top: "35%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
        { top: "39%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
        { top: "47%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
        { top: "51%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
        { top: "55%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
        { top: "63%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
        { top: "67%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
        { top: "71%", left: "9%", width: "80%", height: "1.7%", opacity: 0.15 },
      ];
    }, []);

    const captureVisiblePageStructure = useCallback((): FlipOverlayBar[] => {
      return buildFallbackOverlayBars();
    }, [buildFallbackOverlayBars]);

    const resetFlipAnimation = useCallback(() => {
      const stage = flipStageRef.current;
      if (stage) {
        stage.classList.remove(
          "is-flipping",
          "is-flipping-next",
          "is-flipping-prev",
        );
      }

      if (flipTimeoutRef.current !== null) {
        window.clearTimeout(flipTimeoutRef.current);
        flipTimeoutRef.current = null;
      }

      if (pendingNavTimerRef.current !== null) {
        window.clearTimeout(pendingNavTimerRef.current);
        pendingNavTimerRef.current = null;
      }

      setFlipOverlay(null);
      lastNavDirectionRef.current = null;
      isFlipAnimatingRef.current = false;
    }, []);

    const playFlipAnimation = useCallback(
      (direction: "next" | "prev", bars: FlipOverlayBar[]) => {
        const stage = flipStageRef.current;
        if (!stage) {
          return;
        }

        const directionClass =
          direction === "next" ? "is-flipping-next" : "is-flipping-prev";

        setFlipOverlay({ direction, bars });

        stage.classList.remove(
          "is-flipping",
          "is-flipping-next",
          "is-flipping-prev",
        );
        void stage.offsetWidth;
        stage.classList.add("is-flipping", directionClass);

        if (flipTimeoutRef.current !== null) {
          window.clearTimeout(flipTimeoutRef.current);
        }

        flipTimeoutRef.current = window.setTimeout(() => {
          resetFlipAnimation();
        }, FLIP_DURATION_MS + 1500);
      },
      [resetFlipAnimation],
    );

    const scheduleFlipNavigation = useCallback(
      (direction: "next" | "prev") => {
        const rendition = renditionRef.current;
        if (!rendition || isFlipAnimatingRef.current) {
          return;
        }

        if (
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          void (async () => {
            try {
              if (direction === "next") {
                await rendition.next();
              } else {
                await rendition.prev();
              }
            } catch (navigationError) {
              console.error("Failed to navigate EPUB page", navigationError);
            }
          })();
          return;
        }

        const bars = captureVisiblePageStructure();

        isFlipAnimatingRef.current = true;
        lastNavDirectionRef.current = direction;
        playFlipAnimation(direction, bars);

        if (pendingNavTimerRef.current !== null) {
          window.clearTimeout(pendingNavTimerRef.current);
        }

        pendingNavTimerRef.current = window.setTimeout(() => {
          void (async () => {
            try {
              if (direction === "next") {
                await rendition.next();
              } else {
                await rendition.prev();
              }
            } catch (navigationError) {
              resetFlipAnimation();
              console.error("Failed to navigate EPUB page", navigationError);
            } finally {
              pendingNavTimerRef.current = null;
            }
          })();
        }, FLIP_DURATION_MS);
      },
      [captureVisiblePageStructure, playFlipAnimation, resetFlipAnimation],
    );

    const handleRelocated = useCallback(
      (location: { start?: { cfi?: string } }) => {
        const cfi = location?.start?.cfi ?? null;

        if (!cfi) {
          return;
        }

        syncRelocationState(cfi);

        if (lastNavDirectionRef.current) {
          if (flipTimeoutRef.current !== null) {
            window.clearTimeout(flipTimeoutRef.current);
          }

          flipTimeoutRef.current = window.setTimeout(() => {
            resetFlipAnimation();
          }, 60);
        }
      },
      [resetFlipAnimation, syncRelocationState],
    );

    const handlePrev = useCallback(() => {
      scheduleFlipNavigation("prev");
    }, [scheduleFlipNavigation]);

    const handleNext = useCallback(() => {
      scheduleFlipNavigation("next");
    }, [scheduleFlipNavigation]);

    useEffect(() => {
      return () => {
        if (flipTimeoutRef.current !== null) {
          window.clearTimeout(flipTimeoutRef.current);
          flipTimeoutRef.current = null;
        }
        if (pendingNavTimerRef.current !== null) {
          window.clearTimeout(pendingNavTimerRef.current);
          pendingNavTimerRef.current = null;
        }
        isFlipAnimatingRef.current = false;
      };
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
        setTotalPages(0);
        locationsReadyRef.current = false;
        totalPagesRef.current = 0;
        currentCfiRef.current = initialTargetRef.current.cfi;
        currentPageRef.current =
          typeof initialTargetRef.current.page === "number"
            ? initialTargetRef.current.page
            : 1;
        setCurrentPage(currentPageRef.current);

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

          book.spine.hooks.content.register(
            async (
              document: Document,
              section: { url?: string; document?: Document },
            ) => {
              await rewriteArchivedSectionAssetUrls(book, {
                url: section.url,
                document,
              });
            },
          );

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

          const applyResolvedLocations = (resolvedLocations: string[]) => {
            if (
              !Array.isArray(resolvedLocations) ||
              resolvedLocations.length === 0
            ) {
              return false;
            }

            locationsReadyRef.current = true;
            totalPagesRef.current = resolvedLocations.length;
            setTotalPages(resolvedLocations.length);
            onTotalPages?.(resolvedLocations.length);
            return true;
          };

          const cachedLocations =
            typeof window === "undefined"
              ? null
              : parseStoredLocations(localStorage.getItem(locationsCacheKey));

          if (cachedLocations) {
            applyResolvedLocations(book.locations.load(cachedLocations));
          }

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

          const initialTarget = locationsReadyRef.current
            ? resolveInitialEpubTarget({
                initialCfi: initialTargetRef.current.cfi,
                initialPage: initialTargetRef.current.page,
                book,
              })
            : initialTargetRef.current.cfi;

          await rendition.display(initialTarget || undefined);

          if (!cancelled) {
            setIsLoading(false);
          }

          if (!locationsReadyRef.current) {
            const pendingCanonicalPage =
              !initialTargetRef.current.cfi &&
              typeof initialTargetRef.current.page === "number" &&
              initialTargetRef.current.page > 1
                ? initialTargetRef.current.page
                : null;

            void (async () => {
              try {
                const resolvedLocations = await book.locations.generate(
                  EPUB_LOCATION_BREAK_CHARS,
                );

                if (cancelled) {
                  return;
                }

                if (!applyResolvedLocations(resolvedLocations)) {
                  return;
                }

                if (typeof window !== "undefined") {
                  localStorage.setItem(
                    locationsCacheKey,
                    book.locations.save(),
                  );
                }

                if (pendingCanonicalPage) {
                  const targetCfi = getCfiFromCanonicalPage(
                    book,
                    pendingCanonicalPage,
                  );
                  if (targetCfi) {
                    await rendition.display(targetCfi);
                    return;
                  }
                }

                if (currentCfiRef.current) {
                  syncRelocationState(currentCfiRef.current);
                }
              } catch (locationError) {
                console.warn("Failed to prepare EPUB locations", locationError);
                if (typeof window !== "undefined") {
                  localStorage.removeItem(locationsCacheKey);
                }
              }
            })();
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
      syncRelocationState,
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
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange,
        );
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

        if (
          event.key === "ArrowRight" ||
          event.key === "PageDown" ||
          event.key === " "
        ) {
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
              container as HTMLElement & {
                webkitRequestFullscreen?: () => Promise<void>;
              }
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

    const handleTouchStart = useCallback(
      (event: React.TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      },
      [],
    );

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
        const nextSize = Math.min(
          200,
          Math.max(80, preferences.fontSize + delta),
        );
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
            : "space-y-4",
          themeClasses,
        )}
        style={{
          backgroundColor: isFullscreen
            ? readerTheme.background
            : "transparent",
          color: readerTheme.foreground,
        }}
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
          <Card
            variant="frosted"
            padding="snug"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="heading-font truncate text-base font-bold text-[#241718]">
                {title}
              </p>
              <p className="truncate text-sm font-medium text-[#5d4b4c]">
                {author}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => void handlePrev()}
              >
                ← Prev
              </Button>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => void handleNext()}
              >
                Next →
              </Button>
              <Button
                type="button"
                variant={showToc ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowToc((open) => !open)}
              >
                ☰ TOC
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                ⚙️ Aa
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void toggleFullscreen()}
              >
                ⛶ Full
              </Button>
            </div>
          </Card>
        )}

        <div
          className={clsx(
            "relative mx-auto flex w-full gap-4",
            isFullscreen
              ? "min-h-0 flex-1 px-3 pb-3 pt-14 sm:px-4 sm:pb-4"
              : "",
          )}
        >
          {showToc && (
            <aside
              className={clsx(
                "w-full max-w-xs shrink-0 overflow-y-auto rounded-[28px] border border-[#eadfda] bg-white/95 p-4 shadow-xl",
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
                  <p className="line-clamp-2 text-sm font-bold text-slate-900">
                    {title}
                  </p>
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
                  <p className="text-sm text-slate-500">
                    No table of contents found.
                  </p>
                )}
              </div>
            </aside>
          )}

          <div
            className={clsx(
              "relative flex-1 overflow-hidden rounded-[28px] border card-shadow",
              isFullscreen ? "min-h-0" : "min-h-[720px]",
            )}
            style={{
              background:
                preferences.theme === "dark"
                  ? "linear-gradient(180deg, #202024 0%, #16161a 100%)"
                  : "linear-gradient(180deg, #fffdf8 0%, #f7f1e5 100%)",
              borderColor:
                preferences.theme === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "#e6dcc7",
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {(isLoading || !isLoaded) && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-white/70 backdrop-blur-sm">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
                <p className="text-lg font-semibold text-purple-600">
                  Opening EPUB...
                </p>
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
            <div
              ref={flipStageRef}
              className="absolute inset-0 px-6 py-8 sm:px-10 sm:py-10 epub-flip-stage"
            >
              <div className="epub-flip-page h-full w-full overflow-hidden rounded-[1.5rem] bg-white shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">
                <div ref={viewerRef} className="h-full w-full" />
                <div className="epub-flip-overlay" aria-hidden="true">
                  <div className="epub-flip-overlay__static">
                    <div className="epub-flip-overlay__static-shade" />
                  </div>
                  <div className="epub-flip-overlay__sheet">
                    <div className="epub-flip-overlay__face epub-flip-overlay__face--front">
                      {flipOverlay?.bars.map((bar, index) => (
                        <div
                          key={`flip-front-${index}`}
                          style={{
                            position: "absolute",
                            top: bar.top,
                            left: bar.left,
                            width: bar.width,
                            height: bar.height,
                            borderRadius: "999px",
                            background:
                              preferences.theme === "dark"
                                ? `rgba(226, 232, 240, ${Math.min(
                                    bar.opacity * 1.05,
                                    0.28,
                                  )})`
                                : `rgba(15, 23, 42, ${bar.opacity})`,
                          }}
                        />
                      ))}
                      <div className="epub-flip-overlay__edge" />
                      <div className="epub-flip-overlay__sheen" />
                    </div>
                    <div className="epub-flip-overlay__face epub-flip-overlay__face--back">
                      {flipOverlay?.bars.map((bar, index) => (
                        <div
                          key={`flip-back-${index}`}
                          style={{
                            position: "absolute",
                            top: bar.top,
                            left: bar.left,
                            width: bar.width,
                            height: bar.height,
                            borderRadius: "999px",
                            background:
                              preferences.theme === "dark"
                                ? `rgba(226, 232, 240, ${Math.min(
                                    bar.opacity * 0.75,
                                    0.18,
                                  )})`
                                : `rgba(51, 65, 85, ${Math.min(
                                    bar.opacity * 0.7,
                                    0.12,
                                  )})`,
                          }}
                        />
                      ))}
                      <div className="epub-flip-overlay__back-grain" />
                    </div>
                  </div>
                  <div className="epub-flip-overlay__spine-shadow" />
                </div>
              </div>
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
          <Card variant="frosted" padding="snug" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="heading-font text-sm font-bold text-[#7E1518]">
                Page {currentPage}{" "}
                <span className="text-[#5d4b4c]">of {totalPages}</span>
              </p>
              <Badge
                variant="lime"
                size="sm"
                className="normal-case tracking-normal"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#6F8B6A]" />
                EPUB paginated mode
              </Badge>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5E7E8]">
              <div
                className="h-full rounded-full bg-[#6F8B6A] transition-all duration-300"
                style={{
                  width: `${Math.max(0, currentPage / Math.max(totalPages, 1)) * 100}%`,
                }}
              />
            </div>
          </Card>
        )}
      </div>
    );
  },
);

EpubFlipReader.displayName = "EpubFlipReader";
