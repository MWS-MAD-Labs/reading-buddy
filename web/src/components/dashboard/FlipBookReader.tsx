"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import clsx from "clsx";

type FlipBookProps = {
  pageImages: {
    baseUrl: string;
    count: number;
  };
  initialPage?: number;
  onPageChange?: (pageNumber: number) => void;
  fallbackPdfUrl?: string;
};

const padPageNumber = (page: number) => String(page).padStart(4, "0");

const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

export const FlipBookReader = ({
  pageImages,
  initialPage = 1,
  onPageChange,
  fallbackPdfUrl,
}: FlipBookProps) => {
  const [currentPage, setCurrentPage] = useState(Math.max(initialPage, 1));
  const [jumpToPage, setJumpToPage] = useState("");
  const [zoom, setZoom] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const bookRef = useRef<any>(null);

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

  const pageNumbers = useMemo(
    () => Array.from({ length: pageImages.count }, (_, index) => index + 1),
    [pageImages.count],
  );

  const handleFlip = (pageIndex: number) => {
    // pageIndex from react-pageflip is 0-based
    // Convert to 1-based page number
    const resolvedPage = Math.min(pageImages.count, Math.max(pageIndex + 1, 1));
    setCurrentPage(resolvedPage);
    onPageChange?.(resolvedPage);
  };

  const goToPage = (page: number) => {
    const targetPage = Math.min(pageImages.count, Math.max(1, page));
    if (bookRef.current) {
      bookRef.current.pageFlip().flip(targetPage - 1);
    }
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pageImages.count) {
      goToPage(pageNum);
      setJumpToPage("");
    }
  };

  const adjustZoom = (delta: number) => {
    setZoom((value) => {
      const next = Math.min(
        2,
        Math.max(0.6, parseFloat((value + delta).toFixed(2))),
      );
      return next;
    });
  };

  const zoomLabel = `${Math.round(zoom * 100)}%`;

  // Calculate responsive dimensions based on zoom, viewport, and orientation
  // In portrait mode on mobile: use single page view with dimensions that fit the screen width
  // In landscape mode or desktop: use spread view with wider pages
  const getResponsiveDimensions = () => {
    if (isMobile && isPortrait) {
      // On mobile portrait, make the page fill most of the screen width
      const viewportWidth =
        typeof window !== "undefined" ? window.innerWidth : 375;
      // Account for padding (6 on each side = 12 total, plus some margin)
      const availableWidth = viewportWidth - 60; // 48px for padding, 12px for breathing room
      return {
        baseWidth: Math.min(availableWidth, 500),
        baseHeight: Math.min(availableWidth * 1.4, 700), // Maintain aspect ratio
      };
    }
    return { baseWidth: 500, baseHeight: 700 };
  };

  const { baseWidth, baseHeight } = getResponsiveDimensions();
  const width = Math.round(baseWidth * zoom);
  const height = Math.round(baseHeight * zoom);

  // Navigate to initial page when component mounts
  useEffect(() => {
    if (bookRef.current && initialPage > 1) {
      // Wait a bit for the book to initialize
      const timer = setTimeout(() => {
        if (bookRef.current) {
          bookRef.current.pageFlip().flip(initialPage - 1);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPage]);

  // Preload nearby pages when current page changes
  useEffect(() => {
    const preloadRange = 5; // Preload 5 pages ahead and behind
    const imagesToPreload: string[] = [];

    for (
      let i = Math.max(1, currentPage - preloadRange);
      i <= Math.min(pageImages.count, currentPage + preloadRange);
      i++
    ) {
      const imageUrl = `${pageImages.baseUrl}/page-${padPageNumber(i)}.jpg`;
      imagesToPreload.push(imageUrl);
    }

    // Preload images in background
    imagesToPreload.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, [currentPage, pageImages.baseUrl, pageImages.count]);

  return (
    <div className="space-y-2">
      {/* Compact Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⏮ First
          </button>
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ◀ Prev
          </button>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === pageImages.count}
            className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next ▶
          </button>
          <button
            type="button"
            onClick={() => goToPage(pageImages.count)}
            disabled={currentPage === pageImages.count}
            className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Last ⏭
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-lg border border-violet-300 bg-violet-100 px-2 py-1 text-xs font-bold text-violet-600 hover:bg-violet-200"
          >
            ⚙️ Settings
          </button>
        </div>

        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
          <label
            htmlFor="page-jump"
            className="text-xs font-semibold text-purple-700"
          >
            Go to page:
          </label>
          <input
            id="page-jump"
            type="number"
            min="1"
            max={pageImages.count}
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            placeholder={`1-${pageImages.count}`}
            className="w-16 rounded border border-purple-300 px-1 py-1 text-xs font-semibold text-purple-900 focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-pink-500 px-2 py-1 text-xs font-bold text-white hover:bg-pink-600"
          >
            Go
          </button>
        </form>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-yellow-700">🔍 Zoom</span>
            <button
              type="button"
              onClick={() => adjustZoom(-0.1)}
              className="rounded border border-orange-300 bg-white px-2 py-1 text-sm font-bold text-orange-600 hover:bg-orange-50"
            >
              –
            </button>
            <span className="w-12 rounded border border-yellow-300 bg-white px-2 py-1 text-center text-xs font-bold text-yellow-700">
              {zoomLabel}
            </span>
            <button
              type="button"
              onClick={() => adjustZoom(0.1)}
              className="rounded border border-orange-300 bg-white px-2 py-1 text-sm font-bold text-orange-600 hover:bg-orange-50"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div
        className={`relative mx-auto rounded-lg ${isMobile && isPortrait ? "p-2" : "p-4"}`}
        style={
          isMobile && isPortrait
            ? {
                // Simple background for mobile portrait
                background: "transparent",
              }
            : {
                // Book-like background for desktop/landscape
                background:
                  "linear-gradient(to right, #8B4513 0%, #A0522D 2%, transparent 2%, transparent 98%, #A0522D 98%, #8B4513 100%)",
                boxShadow:
                  "0 10px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(139,69,19,0.2)",
              }
        }
      >
        {/* Book spine effect - only show on desktop/landscape */}
        {!(isMobile && isPortrait) && (
          <>
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{
                background:
                  "linear-gradient(to right, rgba(0,0,0,0.3), transparent)",
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-1"
              style={{
                background:
                  "linear-gradient(to left, rgba(0,0,0,0.3), transparent)",
              }}
            />
          </>
        )}

        <HTMLFlipBook
          ref={bookRef}
          width={width}
          height={height}
          size={isMobile && isPortrait ? "fixed" : "stretch"}
          minWidth={Math.round(baseWidth * 0.6)}
          maxWidth={Math.round(baseWidth * 2)}
          minHeight={Math.round(baseHeight * 0.6)}
          maxHeight={Math.round(baseHeight * 2)}
          drawShadow={true}
          flippingTime={1000}
          usePortrait={isMobile && isPortrait}
          startZIndex={0}
          autoSize={isMobile && isPortrait ? false : true}
          maxShadowOpacity={0.5}
          showCover={false}
          mobileScrollSupport={true}
          clickEventForward={true}
          useMouseEvents={true}
          swipeDistance={30}
          showPageCorners={true}
          disableFlipByClick={false}
          startPage={0}
          onFlip={(event: { data: number }) => handleFlip(event.data)}
          className="mx-auto"
          style={{
            boxShadow:
              isMobile && isPortrait
                ? "0 0 20px rgba(0,0,0,0.15)"
                : "0 0 30px rgba(0,0,0,0.2)",
          }}
        >
          {pageNumbers.map((pageNumber) => {
            const imageUrl = `${pageImages.baseUrl}/page-${padPageNumber(pageNumber)}.jpg`;

            // Calculate distance from current page for lazy loading
            const distanceFromCurrent = Math.abs(pageNumber - currentPage);

            // Load strategy:
            // - Current page and next/previous 3 pages: load eagerly
            // - Pages 4-10 away: lazy load
            // - Pages 10+ away: don't load yet (use placeholder)
            const shouldLoad = distanceFromCurrent <= 10;
            const isNearby = distanceFromCurrent <= 3;

            return (
              <article
                key={pageNumber}
                className={clsx(
                  "relative overflow-hidden",
                  // Book-like page styling
                  pageNumber % 2 === 0
                    ? "bg-gradient-to-l from-amber-50 via-white to-amber-100/50" // Right page
                    : "bg-gradient-to-r from-amber-50 via-white to-amber-100/50", // Left page
                )}
                style={{
                  boxShadow:
                    pageNumber % 2 === 0
                      ? "inset 4px 0 8px rgba(0,0,0,0.05)" // Right page shadow
                      : "inset -4px 0 8px rgba(0,0,0,0.05)", // Left page shadow
                }}
              >
                {/* Book page content */}
                <div className="relative h-full w-full p-2">
                  {shouldLoad ? (
                    <Image
                      src={imageUrl}
                      alt={`Page ${pageNumber}`}
                      className="h-full w-full object-contain"
                      width={width}
                      height={height}
                      priority={isNearby}
                      loading={isNearby ? "eager" : "lazy"}
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    />
                  ) : (
                    // Placeholder for distant pages
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                      <p className="text-sm font-semibold text-amber-400">
                        Page {pageNumber}
                      </p>
                    </div>
                  )}
                </div>

                {/* Page number at bottom */}
                <div className="absolute bottom-3 left-0 right-0 text-center">
                  <span className="text-xs font-serif text-amber-800/40">
                    {pageNumber}
                  </span>
                </div>
              </article>
            );
          })}
        </HTMLFlipBook>
      </div>

      <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <p className="text-sm text-indigo-600">
              Viewing page{" "}
              <span className="font-semibold text-indigo-900">
                {currentPage}
              </span>{" "}
              of {pageImages.count}
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-xs font-semibold text-green-700">
                Progress auto-saved
              </p>
            </div>
          </div>
          {fallbackPdfUrl ? (
            <a
              href={fallbackPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-md hover:opacity-90"
            >
              Open PDF
            </a>
          ) : null}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(currentPage / pageImages.count) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
