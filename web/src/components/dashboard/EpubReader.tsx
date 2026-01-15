"use client";

/**
 * Native EPUB Reader Component
 * Uses epub.js for direct EPUB rendering with reading preferences
 */

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import {
    useReadingPreferences,
    ReadingSettings,
    getPreferenceClasses,
} from "./reader/ReadingSettings";

// Dynamic import for epub.js to avoid SSR issues
const ReactReader = dynamic(
    () => import("react-reader").then((mod) => mod.ReactReader),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-96 items-center justify-center">
                <div className="text-lg font-semibold text-purple-600">Loading EPUB reader...</div>
            </div>
        ),
    }
);

interface EpubReaderProps {
    epubUrl: string;
    bookTitle?: string;
    initialLocation?: string;
    onLocationChange?: (location: string, pageNumber?: number) => void;
}

export function EpubReader({
    epubUrl,
    bookTitle,
    initialLocation,
    onLocationChange,
}: EpubReaderProps) {
    const [location, setLocation] = useState<string | null>(initialLocation || null);
    const [showSettings, setShowSettings] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renditionRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [error, setError] = useState<string | null>(null);

    const { preferences, updatePreferences, resetPreferences, isLoaded } = useReadingPreferences();

    // Check if the EPUB URL is accessible
    useEffect(() => {
        const checkUrl = async () => {
            try {
                const response = await fetch(epubUrl, { method: "HEAD" });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                setError(null);
            } catch (err) {
                console.error("Error accessing EPUB file:", err);
                setError(err instanceof Error ? err.message : "Failed to load book");
            }
        };

        if (epubUrl) {
            checkUrl();
        }
    }, [epubUrl]);

    // Apply reading preferences to rendition
    const applyPreferences = useCallback(() => {
        if (!renditionRef.current) return;

        const rendition = renditionRef.current;

        // Apply font size
        rendition.themes.fontSize(`${preferences.fontSize}%`);

        // Apply font family
        const fontFamilyMap: Record<string, string> = {
            system: "system-ui, -apple-system, sans-serif",
            sans: "'Inter', sans-serif",
            serif: "'Lora', Georgia, serif",
            readable: "'Open Sans', sans-serif",
            dyslexic: "'OpenDyslexic', sans-serif",
        };
        rendition.themes.font(fontFamilyMap[preferences.fontFamily] || fontFamilyMap.system);

        // Apply line spacing
        const lineSpacingMap: Record<string, string> = {
            tight: "1.3",
            normal: "1.6",
            relaxed: "1.9",
            loose: "2.2",
        };
        rendition.themes.override("line-height", lineSpacingMap[preferences.lineSpacing] || "1.6");

        // Apply theme colors
        const themeStyles: Record<string, { body: { background: string; color: string } }> = {
            light: {
                body: { background: "#ffffff", color: "#1a1a1a" },
            },
            dark: {
                body: { background: "#1a1a2e", color: "#e0e0e0" },
            },
            sepia: {
                body: { background: "#fdf6e3", color: "#5c4b37" },
            },
        };
        rendition.themes.register("custom", themeStyles[preferences.theme] || themeStyles.light);
        rendition.themes.select("custom");
    }, [preferences]);

    // Apply preferences when they change
    useEffect(() => {
        if (isLoaded) {
            applyPreferences();
        }
    }, [preferences, isLoaded, applyPreferences]);

    // Handle location change
    const handleLocationChange = useCallback(
        (epubcfi: string) => {
            setLocation(epubcfi);
            onLocationChange?.(epubcfi, currentPage);
        },
        [onLocationChange, currentPage]
    );

    // Handle rendition setup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRendition = useCallback((rendition: any) => {
        renditionRef.current = rendition;

        // Get total pages when book is loaded
        rendition.on("relocated", (loc: { start: { displayed: { page: number; total: number } } }) => {
            setCurrentPage(loc.start.displayed.page);
            setTotalPages(loc.start.displayed.total);
        });

        // Apply initial preferences
        setTimeout(() => applyPreferences(), 100);
    }, [applyPreferences]);

    // Fullscreen handling
    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;

        try {
            if (!isFullscreen) {
                if (containerRef.current.requestFullscreen) {
                    await containerRef.current.requestFullscreen();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } else if ((containerRef.current as any).webkitRequestFullscreen) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (containerRef.current as any).webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } else if ((document as any).webkitExitFullscreen) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (document as any).webkitExitFullscreen();
                }
            }
        } catch (err) {
            console.error("Fullscreen error:", err);
        }
    }, [isFullscreen]);

    // Handle fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = Boolean(
                document.fullscreenElement ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (document as any).webkitFullscreenElement
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

    // Get theme-based container class
    const themeClasses = getPreferenceClasses(preferences);
    const containerBg = {
        light: "bg-white",
        dark: "bg-gray-900",
        sepia: "bg-amber-50",
    }[preferences.theme] || "bg-white";

    if (!isLoaded) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="text-lg font-semibold text-purple-600">Loading preferences...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-3xl border-4 border-red-200 bg-red-50 p-8 text-center">
                <div className="text-4xl">⚠️</div>
                <h3 className="text-xl font-bold text-red-800">Error Loading Book</h3>
                <p className="max-w-md text-red-600">
                    {error.includes("502")
                        ? "The book server is currently unavailable (502 Bad Gateway). Please try again later."
                        : `We couldn't load this book: ${error}`}
                </p>
                <div className="text-sm text-red-500">
                    Technical details: {epubUrl}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={clsx(
                "relative rounded-3xl border-4 border-purple-300 shadow-2xl overflow-hidden",
                containerBg,
                themeClasses,
                isFullscreen ? "fixed inset-0 z-50 rounded-none border-0" : ""
            )}
        >
            {/* Header Controls */}
            <div className="flex items-center justify-between border-b border-purple-200 bg-gradient-to-r from-purple-100 to-indigo-100 px-4 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📖</span>
                    <span className="font-semibold text-purple-800 truncate max-w-[200px] md:max-w-none">
                        {bookTitle || "EPUB Reader"}
                    </span>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Native EPUB
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="rounded-full bg-purple-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-purple-600"
                    >
                        ⚙️ Settings
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="rounded-full bg-indigo-500 px-3 py-1.5 text-sm font-bold text-white hover:bg-indigo-600"
                    >
                        {isFullscreen ? "⊙ Exit" : "⛶ Fullscreen"}
                    </button>
                </div>
            </div>

            {/* EPUB Reader */}
            <div
                className={clsx(
                    "relative",
                    isFullscreen ? "h-[calc(100vh-100px)]" : "h-[70vh] min-h-[500px]"
                )}
            >
                <ReactReader
                    url={epubUrl}
                    location={location}
                    locationChanged={handleLocationChange}
                    getRendition={handleRendition}
                    epubOptions={{
                        flow: "paginated",
                        manager: "default",
                    }}
                />
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between border-t border-purple-200 bg-gradient-to-r from-purple-100 to-indigo-100 px-4 py-2">
                <div className="text-sm font-medium text-purple-700">
                    {currentPage > 0 && totalPages > 0 ? (
                        <>Page {currentPage} of {totalPages}</>
                    ) : (
                        <>Loading...</>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => renditionRef.current?.prev()}
                        className="rounded-lg bg-purple-500 px-3 py-1 text-sm font-bold text-white hover:bg-purple-600"
                    >
                        ◀ Prev
                    </button>
                    <button
                        onClick={() => renditionRef.current?.next()}
                        className="rounded-lg bg-purple-500 px-3 py-1 text-sm font-bold text-white hover:bg-purple-600"
                    >
                        Next ▶
                    </button>
                </div>
            </div>

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

export default EpubReader;
