"use client";

import { useState } from "react";
import { Check, X, Loader2, MessageSquare } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { moderateReview } from "@/app/(dashboard)/dashboard/library/review-actions";
import type { BookReview } from "@/app/(dashboard)/dashboard/library/review-actions";

type ReviewWithBook = BookReview & { bookTitle: string };

type Props = {
    initialReviews: ReviewWithBook[];
};

export function ReviewModerationList({ initialReviews }: Props) {
    const [reviews, setReviews] = useState<ReviewWithBook[]>(initialReviews);
    const [processing, setProcessing] = useState<string | null>(null);
    const [showFeedbackFor, setShowFeedbackFor] = useState<string | null>(null);
    const [feedback, setFeedback] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleApprove = async (reviewId: string) => {
        setProcessing(reviewId);
        setError(null);
        try {
            const result = await moderateReview(reviewId, "approve");
            if (result.success) {
                setReviews((prev) => prev.filter((r) => r.id !== reviewId));
            } else {
                setError(result.error || "Failed to approve");
            }
        } catch (err) {
            console.error("Approval failed:", err);
            setError("Failed to approve review");
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectClick = (reviewId: string) => {
        setShowFeedbackFor(reviewId);
        setFeedback("");
        setError(null);
    };

    const handleRejectSubmit = async (reviewId: string) => {
        if (feedback.trim().length < 10) {
            setError("Feedback must be at least 10 characters");
            return;
        }

        setProcessing(reviewId);
        setError(null);
        try {
            const result = await moderateReview(reviewId, "reject", feedback);
            if (result.success) {
                setReviews((prev) => prev.filter((r) => r.id !== reviewId));
                setShowFeedbackFor(null);
                setFeedback("");
            } else {
                setError(result.error || "Failed to reject");
            }
        } catch (err) {
            console.error("Rejection failed:", err);
            setError("Failed to reject review");
        } finally {
            setProcessing(null);
        }
    };

    if (reviews.length === 0) {
        return (
            <div className="rounded-3xl border-4 border-dashed border-green-300 bg-green-50 p-12 text-center shadow-lg">
                <div className="mb-4 text-6xl">✅</div>
                <h2 className="text-xl font-bold text-green-700">All caught up!</h2>
                <p className="text-green-600">No pending reviews to moderate.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""} pending moderation
            </div>

            <div className="space-y-4">
                {reviews.map((review) => {
                    const isProcessing = processing === review.id;
                    const isShowingFeedback = showFeedbackFor === review.id;
                    const formattedDate = new Date(review.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    return (
                        <div
                            key={review.id}
                            className="rounded-2xl border-2 border-purple-200 bg-white p-5 shadow-sm"
                        >
                            {/* Header */}
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="font-bold text-purple-900">{review.bookTitle}</h3>
                                    <p className="text-sm text-gray-500">
                                        by <span className="font-medium text-purple-600">{review.studentName}</span>
                                        {" · "}
                                        {formattedDate}
                                    </p>
                                </div>
                                <StarRating value={review.rating} readonly size="md" />
                            </div>

                            {/* Comment */}
                            <div className="mb-4 rounded-xl bg-gray-50 p-4">
                                <p className="text-sm leading-relaxed text-gray-700">{review.comment}</p>
                            </div>

                            {/* Feedback Input (shown when rejecting) */}
                            {isShowingFeedback && (
                                <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 p-4">
                                    <div className="mb-2 flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-red-600" />
                                        <label className="text-sm font-semibold text-red-700">
                                            Feedback for Student (required)
                                        </label>
                                    </div>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        placeholder="Explain why this review is being rejected and how the student can improve it..."
                                        rows={3}
                                        className="w-full rounded-lg border border-red-200 p-3 text-sm outline-none focus:border-red-400"
                                    />
                                    <p className="mt-1 text-xs text-red-600">
                                        {feedback.length}/10 characters minimum
                                    </p>
                                    {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowFeedbackFor(null);
                                                setFeedback("");
                                                setError(null);
                                            }}
                                            className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleRejectSubmit(review.id)}
                                            disabled={isProcessing || feedback.trim().length < 10}
                                            className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <X className="h-3 w-3" />
                                            )}
                                            Confirm Rejection
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            {!isShowingFeedback && (
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => handleRejectClick(review.id)}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1.5 rounded-full border-2 border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(review.id)}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:scale-105 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Check className="h-4 w-4" />
                                        )}
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
