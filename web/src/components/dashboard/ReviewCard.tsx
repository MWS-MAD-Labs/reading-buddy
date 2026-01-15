"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { voteReview } from "@/app/(dashboard)/dashboard/library/review-actions";
import type { BookReview } from "@/app/(dashboard)/dashboard/library/review-actions";

type ReviewCardProps = {
    review: BookReview;
    isOwnReview?: boolean;
};

export function ReviewCard({ review, isOwnReview = false }: ReviewCardProps) {
    const [voteCount, setVoteCount] = useState(review.voteCount);
    const [hasVoted, setHasVoted] = useState(review.hasVoted);
    const [isVoting, setIsVoting] = useState(false);

    const handleVote = async () => {
        if (isOwnReview || isVoting) return;

        setIsVoting(true);
        try {
            const result = await voteReview(review.id);
            if (result.success) {
                setVoteCount(result.newVoteCount);
                setHasVoted(!hasVoted);
            }
        } catch (error) {
            console.error("Failed to vote:", error);
        } finally {
            setIsVoting(false);
        }
    };

    const formattedDate = new Date(review.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    return (
        <div className="rounded-2xl border-2 border-purple-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 text-sm font-bold text-white">
                        {review.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-purple-900">{review.studentName}</p>
                        <p className="text-xs text-gray-500">{formattedDate}</p>
                    </div>
                </div>
                <StarRating value={review.rating} readonly size="sm" />
            </div>

            {/* Comment */}
            <p className="mb-4 text-sm leading-relaxed text-gray-700">{review.comment}</p>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-purple-100 pt-3">
                <button
                    onClick={handleVote}
                    disabled={isOwnReview || isVoting}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${hasVoted
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-600"
                        } ${isOwnReview ? "cursor-not-allowed opacity-50" : ""}`}
                >
                    <ThumbsUp className={`h-3.5 w-3.5 ${hasVoted ? "fill-current" : ""}`} />
                    <span>Helpful ({voteCount})</span>
                </button>

                {review.status === "PENDING" && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        Pending Review
                    </span>
                )}
            </div>
        </div>
    );
}
