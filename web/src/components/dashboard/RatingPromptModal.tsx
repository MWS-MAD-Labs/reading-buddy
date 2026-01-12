"use client";

import { useState } from "react";
import { X, Loader2, Star, PartyPopper } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { submitBookReview } from "@/app/(dashboard)/dashboard/library/review-actions";

type RatingPromptModalProps = {
    bookId: number;
    bookTitle?: string;
    onClose: () => void;
    onSubmitted?: () => void;
};

export function RatingPromptModal({
    bookId,
    bookTitle,
    onClose,
    onSubmitted,
}: RatingPromptModalProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0 || comment.trim().length < 10) return;

        setSubmitting(true);
        setError(null);

        try {
            const result = await submitBookReview(bookId, rating, comment);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    onSubmitted?.();
                    onClose();
                }, 2000);
            } else {
                setError(result.error || "Failed to submit review");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border-4 border-amber-300 bg-white shadow-2xl">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-gray-500 shadow-md transition hover:bg-gray-100 hover:text-gray-700"
                >
                    <X className="h-5 w-5" />
                </button>

                {success ? (
                    <div className="p-8 text-center">
                        <PartyPopper className="mx-auto mb-4 h-16 w-16 text-amber-500" />
                        <h2 className="mb-2 text-2xl font-black text-purple-900">Thank you! 🎉</h2>
                        <p className="text-purple-600">
                            Your review has been submitted and is awaiting moderation.
                        </p>
                    </div>
                ) : (
                    <div className="p-6">
                        {/* Header */}
                        <div className="mb-6 text-center">
                            <Star className="mx-auto mb-2 h-12 w-12 text-amber-400" />
                            <h2 className="text-xl font-black text-purple-900">
                                Congrats on finishing!
                            </h2>
                            {bookTitle && (
                                <p className="mt-1 text-sm text-purple-600">
                                    How did you like <span className="font-bold">{bookTitle}</span>?
                                </p>
                            )}
                        </div>

                        {/* Rating */}
                        <div className="mb-4 text-center">
                            <label className="mb-2 block text-sm font-semibold text-purple-700">
                                Your Rating
                            </label>
                            <div className="flex justify-center">
                                <StarRating value={rating} onChange={setRating} size="lg" />
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold text-purple-700">
                                Tell us why (min 10 characters)
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="What did you think about this book?"
                                rows={3}
                                className="w-full rounded-xl border-2 border-purple-200 p-3 text-sm outline-none transition focus:border-purple-400"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {comment.length}/10 characters minimum
                            </p>
                        </div>

                        {error && <p className="mb-3 text-center text-sm text-red-600">{error}</p>}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-full border-2 border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                            >
                                Maybe Later
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || rating === 0 || comment.trim().length < 10}
                                className="flex-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? (
                                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                                ) : (
                                    "Submit Review"
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
