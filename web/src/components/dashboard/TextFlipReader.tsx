"use client";

/**
 * Text Flip Reader Component
 * Renders book text with flip animation using react-pageflip
 */

import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import {
    useReadingPreferences,
    getPreferenceClasses,
    getPreferenceStyles,
    ReadingSettings,
} from "./reader/ReadingSettings";

// Import reader fonts CSS
import "@/styles/reader-fonts.css";

export type TextFlipReaderRef = {
    goToPage: (page: number) => void;
};

type TextFlipReaderProps = {
    textContent: {
        pages: Array<{
            pageNumber: number;
            text: string;
            wordCount: number;
        }>;
        totalPages: number;
    };
    initialPage?: number;
    onPageChange?: (pageNumber: number) => void;
    bookTitle?: string;
};

const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

export const TextFlipReader = forwardRef<TextFlipReaderRef, TextFlipReaderProps>(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ textContent, initialPage = 1, onPageChange, bookTitle }, ref) => {
        const [currentPage, setCurrentPage] = useState(Math.max(initialPage, 1));
        const [jumpToPage, setJumpToPage] = useState("");
        const [showSettings, setShowSettings] = useState(false);
        const [isPortrait, setIsPortrait] = useState(false);
        const [isMobile, setIsMobile] = useState(false);
        const [isFullscreen, setIsFullscreen] = useState(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bookRef = useRef<any>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        const { preferences, updatePreferences, resetPreferences, isLoaded } = useReadingPreferences();

        // Define goToPage first to avoid hoisting issues
        const goToPageHandler = useCallback(
            (page: number) => {
                const targetPage = Math.min(textContent.totalPages, Math.max(1, page));
                if (bookRef.current) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (bookRef.current as any).pageFlip().flip(targetPage - 1);
                }
            },
            [textContent.totalPages]
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
                    (document as any).webkitFullscreenElement ||
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (document as any).mozFullScreenElement ||
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (document as any).msFullscreenElement
                );
                setIsFullscreen(isCurrentlyFullscreen);
            };

            document.addEventListener("fullscreenchange", handleFullscreenChange);
            document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

            return () => {
                document.removeEventListener("fullscreenchange", handleFullscreenChange);
                document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
            };
        }, []);

        const handleFlip = useCallback(
            (pageIndex: number) => {
                const resolvedPage = Math.min(textContent.totalPages, Math.max(pageIndex + 1, 1));
                setCurrentPage(resolvedPage);
                onPageChange?.(resolvedPage);
            },
            [textContent.totalPages, onPageChange]
        );

        const handleJumpSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            const pageNum = parseInt(jumpToPage, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= textContent.totalPages) {
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

        // Calculate dimensions
        const getResponsiveDimensions = () => {
            const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 375;
            const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 667;

            if (isFullscreen) {
                const padding = 20;
                const availableWidth = viewportWidth - padding;
                const availableHeight = viewportHeight - padding;
                const usePortraitLayout = viewportHeight > viewportWidth;

                const aspectRatio = 1.4;
                if (usePortraitLayout) {
                    let pageHeight = availableHeight;
                    let pageWidth = pageHeight / aspectRatio;
                    if (pageWidth > availableWidth) {
                        pageWidth = availableWidth;
                        pageHeight = pageWidth * aspectRatio;
                    }
                    return { baseWidth: pageWidth, baseHeight: pageHeight };
                } else {
                    let pageHeight = availableHeight;
                    let pageWidth = pageHeight / aspectRatio;
                    if (pageWidth * 2 > availableWidth) {
                        pageWidth = availableWidth / 2;
                        pageHeight = pageWidth * aspectRatio;
                    }
                    return { baseWidth: pageWidth, baseHeight: pageHeight };
                }
            }

            if (isMobile && isPortrait) {
                const availableWidth = viewportWidth - 60;
                return {
                    baseWidth: Math.min(availableWidth, 500),
                    baseHeight: Math.min(availableWidth * 1.4, 700),
                };
            }

            return { baseWidth: 450, baseHeight: 630 };
        };

        const { baseWidth, baseHeight } = getResponsiveDimensions();
        const width = Math.round(baseWidth);
        const height = Math.round(baseHeight);

        // Navigate to initial page when component mounts
        useEffect(() => {
            if (bookRef.current && initialPage > 1) {
                const timer = setTimeout(() => {
                    if (bookRef.current) {
                        bookRef.current.pageFlip().flip(initialPage - 1);
                    }
                }, 100);
                return () => clearTimeout(timer);
            }
        }, [initialPage]);

        const themeClasses = getPreferenceClasses(preferences);
        const themeStyles = getPreferenceStyles(preferences);

        // Don't render until preferences are loaded
        if (!isLoaded) {
            return (
                <div className="flex h-96 items-center justify-center">
                    <div className="text-lg font-semibold text-purple-600">Loading reader...</div>
                </div>
            );
        }

        return (
            <div
                ref={containerRef}
                className={clsx(
                    isFullscreen
                        ? "fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center"
                        : "space-y-2",
                    themeClasses
                )}
                style={isFullscreen ? { backgroundColor: "var(--reader-bg)" } : {}}
            >
                {/* Floating Exit Button - Only shown in fullscreen */}
                {isFullscreen && (
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="fixed top-4 right-4 z-[10000] rounded-full bg-gray-900/80 hover:bg-gray-900 px-4 py-2 text-sm font-bold text-white shadow-2xl backdrop-blur-sm transition-all hover:scale-105"
                        title="Exit Fullscreen (ESC)"
                    >
                        ✕ Exit Fullscreen
                    </button>
                )}

                {/* Navigation Controls - Hidden in fullscreen */}
                {!isFullscreen && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-2">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => goToPageHandler(1)}
                                disabled={currentPage === 1}
                                className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40"
                            >
                                ⏮ First
                            </button>
                            <button
                                type="button"
                                onClick={() => goToPageHandler(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40"
                            >
                                ◀ Prev
                            </button>
                            <button
                                type="button"
                                onClick={() => goToPageHandler(currentPage + 1)}
                                disabled={currentPage === textContent.totalPages}
                                className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40"
                            >
                                Next ▶
                            </button>
                            <button
                                type="button"
                                onClick={() => goToPageHandler(textContent.totalPages)}
                                disabled={currentPage === textContent.totalPages}
                                className="rounded-lg bg-purple-500 px-2 py-1 text-xs font-bold text-white hover:bg-purple-600 disabled:opacity-40"
                            >
                                Last ⏭
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                className="rounded-lg border border-indigo-300 bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-600 hover:bg-indigo-200"
                            >
                                ⬆️ Full
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSettings(true)}
                                className="rounded-lg border border-violet-300 bg-violet-100 px-2 py-1 text-xs font-bold text-violet-600 hover:bg-violet-200"
                            >
                                ⚙️ Settings
                            </button>
                        </div>

                        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
                            <label htmlFor="page-jump" className="text-xs font-semibold text-purple-700">
                                Go to:
                            </label>
                            <input
                                id="page-jump"
                                type="number"
                                min="1"
                                max={textContent.totalPages}
                                value={jumpToPage}
                                onChange={(e) => setJumpToPage(e.target.value)}
                                placeholder={`1-${textContent.totalPages}`}
                                className="w-16 rounded border border-purple-300 px-1 py-1 text-xs"
                            />
                            <button
                                type="submit"
                                className="rounded-lg bg-pink-500 px-2 py-1 text-xs font-bold text-white hover:bg-pink-600"
                            >
                                Go
                            </button>
                        </form>
                    </div>
                )}

                {/* Flip Book */}
                <div
                    className={clsx(
                        "relative mx-auto",
                        isFullscreen ? "flex-1 flex items-center justify-center" : "rounded-lg",
                        isMobile && isPortrait && !isFullscreen ? "p-2" : isFullscreen ? "p-0" : "p-4"
                    )}
                    style={
                        isFullscreen
                            ? { background: "var(--reader-bg)" }
                            : {
                                background:
                                    "linear-gradient(to right, #8B4513 0%, #A0522D 2%, transparent 2%, transparent 98%, #A0522D 98%, #8B4513 100%)",
                                boxShadow:
                                    "0 10px 40px rgba(0,0,0,0.3), inset 0 0 20px rgba(139,69,19,0.2)",
                            }
                    }
                >
                    <HTMLFlipBook
                        key={`textflip-${isFullscreen ? "fs" : "normal"}-${isMobile && isPortrait ? "portrait" : "landscape"}`}
                        ref={bookRef}
                        width={width}
                        height={height}
                        size={isFullscreen || (isMobile && isPortrait) ? "fixed" : "stretch"}
                        minWidth={Math.round(baseWidth * 0.6)}
                        maxWidth={Math.round(baseWidth * 2)}
                        minHeight={Math.round(baseHeight * 0.6)}
                        maxHeight={Math.round(baseHeight * 2)}
                        drawShadow={true}
                        flippingTime={1000}
                        usePortrait={
                            isFullscreen
                                ? typeof window !== "undefined"
                                    ? window.innerHeight > window.innerWidth
                                    : false
                                : isMobile && isPortrait
                        }
                        startZIndex={0}
                        autoSize={isFullscreen || (isMobile && isPortrait) ? false : true}
                        maxShadowOpacity={0.5}
                        showCover={false}
                        mobileScrollSupport={true}
                        clickEventForward={true}
                        useMouseEvents={true}
                        swipeDistance={30}
                        showPageCorners={!isFullscreen}
                        disableFlipByClick={false}
                        startPage={currentPage - 1}
                        onFlip={(event: { data: number }) => handleFlip(event.data)}
                        className="mx-auto"
                        style={{}}
                    >
                        {textContent.pages.map((page) => (
                            <article
                                key={page.pageNumber}
                                className={clsx(
                                    "reader-page-card reader-content",
                                    page.pageNumber % 2 === 0 ? "" : "reader-page-card--left",
                                    themeClasses
                                )}
                                style={themeStyles}
                            >
                                <div className="reader-page-content overflow-y-auto">
                                    <p className="whitespace-pre-wrap">{page.text}</p>
                                </div>
                                <div className="reader-page-number">{page.pageNumber}</div>
                            </article>
                        ))}
                    </HTMLFlipBook>
                </div>

                {/* Progress Bar - Hidden in fullscreen */}
                {!isFullscreen && (
                    <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-indigo-600">
                                Page <span className="font-semibold text-indigo-900">{currentPage}</span> of{" "}
                                {textContent.totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                <p className="text-xs font-semibold text-green-700">Text Mode</p>
                            </div>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                                style={{ width: `${(currentPage / textContent.totalPages) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Reading Settings Modal */}
                <ReadingSettings
                    preferences={preferences}
                    onUpdate={updatePreferences}
                    onReset={resetPreferences}
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                />
            </div>
        );
    }
);

TextFlipReader.displayName = "TextFlipReader";
