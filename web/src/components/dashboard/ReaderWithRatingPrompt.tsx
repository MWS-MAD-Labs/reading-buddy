"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { UnifiedBookReader } from "./UnifiedBookReader";
import { RatingPromptModal } from "./RatingPromptModal";
import { getUserReview } from "@/app/(dashboard)/dashboard/library/review-actions";
import { markBookAsCompleted } from "@/app/(dashboard)/dashboard/student/actions";
import { BookOpen, X, CheckCircle } from "lucide-react";

type PageImageInfo = {
    baseUrl: string;
    count: number;
};

type ReaderWithRatingPromptProps = {
    bookId: number;
    bookTitle?: string;
    pdfUrl: string;
    epubUrl?: string | null;
    initialPage?: number;
    pageImages?: PageImageInfo | null;
    textJsonUrl?: string | null;
    textExtractionStatus?: string | null;
    fileFormat?: "pdf" | "epub";
    totalPages?: number | null;
};

/**
 * Best practices for book completion thresholds:
 * - 90% threshold accounts for back matter (footnotes, acknowledgments, index)
 * - Confirmation dialog ensures intentional completion
 */
const COMPLETION_THRESHOLD_PERCENT = 90;
const FINISH_BUTTON_DELAY_MS = 5000;

export function ReaderWithRatingPrompt({
    bookId,
    bookTitle,
    pdfUrl,
    epubUrl,
    initialPage = 1,
    pageImages,
    textJsonUrl,
    textExtractionStatus,
    fileFormat = "pdf",
    totalPages,
}: ReaderWithRatingPromptProps) {
    const [showRatingPrompt, setShowRatingPrompt] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [hasReviewed, setHasReviewed] = useState<boolean | null>(null);
    const [hasShownPrompt, setHasShownPrompt] = useState(false);
    const [showFinishButton, setShowFinishButton] = useState(false);
    const [currentPage, setCurrentPage] = useState(initialPage);

    const finishButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        getUserReview(bookId).then((review) => {
            setHasReviewed(review !== null);
        });
    }, [bookId]);

    useEffect(() => {
        return () => {
            if (finishButtonTimeoutRef.current) {
                clearTimeout(finishButtonTimeoutRef.current);
            }
        };
    }, []);

    const handleConfirmFinish = useCallback(async () => {
        setShowConfirmDialog(false);

        try {
            await markBookAsCompleted({ bookId });
        } catch (error) {
            console.error("Failed to mark book as completed:", error);
        }

        if (hasReviewed === false && !hasShownPrompt) {
            setShowRatingPrompt(true);
            setHasShownPrompt(true);
        }
    }, [bookId, hasReviewed, hasShownPrompt]);

    const handleFinishClick = useCallback(() => {
        setShowConfirmDialog(true);
    }, []);

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);

        if (finishButtonTimeoutRef.current) {
            clearTimeout(finishButtonTimeoutRef.current);
            finishButtonTimeoutRef.current = null;
        }

        const progressPercent = totalPages ? (page / totalPages) * 100 : 0;
        const hasReachedThreshold = progressPercent >= COMPLETION_THRESHOLD_PERCENT;

        if (hasReachedThreshold) {
            finishButtonTimeoutRef.current = setTimeout(() => {
                setShowFinishButton(true);
            }, FINISH_BUTTON_DELAY_MS);
        } else {
            setShowFinishButton(false);
        }
    }, [totalPages]);

    return (
        <>
            <UnifiedBookReader
                bookId={bookId}
                bookTitle={bookTitle}
                pdfUrl={pdfUrl}
                epubUrl={epubUrl}
                initialPage={initialPage}
                pageImages={pageImages}
                textJsonUrl={textJsonUrl}
                textExtractionStatus={textExtractionStatus}
                fileFormat={fileFormat}
                onPageChange={handlePageChange}
                onComplete={handleFinishClick}
                showFinishButton={showFinishButton}
            />

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && setShowConfirmDialog(false)}
                >
                    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-4 border-green-300 bg-white p-6 shadow-2xl">
                        <button
                            onClick={() => setShowConfirmDialog(false)}
                            className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="text-center">
                            <BookOpen className="mx-auto mb-4 h-12 w-12 text-green-500" />
                            <h3 className="mb-2 text-xl font-bold text-gray-900">
                                Finish Reading?
                            </h3>
                            <p className="mb-6 text-sm text-gray-600">
                                Are you sure you want to mark{" "}
                                <span className="font-semibold text-purple-600">
                                    {bookTitle || "this book"}
                                </span>{" "}
                                as finished? You can always come back to read more later.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmDialog(false)}
                                    className="flex-1 rounded-full border-2 border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                                >
                                    Keep Reading
                                </button>
                                <button
                                    onClick={handleConfirmFinish}
                                    className="flex-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:scale-105"
                                >
                                    <CheckCircle className="mr-1.5 inline-block h-4 w-4" />
                                    Yes, I'm Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRatingPrompt && (
                <RatingPromptModal
                    bookId={bookId}
                    bookTitle={bookTitle}
                    onClose={() => setShowRatingPrompt(false)}
                    onSubmitted={() => setHasReviewed(true)}
                />
            )}
        </>
    );
}
