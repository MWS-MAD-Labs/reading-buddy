"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, X, Loader2, MessageSquare, Star } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { ReviewCard } from "@/components/dashboard/ReviewCard";
import {
    getBookDetails,
    getBookReviews,
    getUserReview,
    submitBookReview,
    resubmitReview,
    type BookDetails,
    type BookReview,
} from "@/app/(dashboard)/dashboard/library/review-actions";

type BookDetailsModalProps = {
    bookId: number | null;
    onClose: () => void;
    onReadBook?: (bookId: number) => void;
};

type SortOption = "latest" | "most_voted";

export function BookDetailsModal({ bookId, onClose, onReadBook }: BookDetailsModalProps) {
    const [book, setBook] = useState<BookDetails | null>(null);
    const [reviews, setReviews] = useState<BookReview[]>([]);
    const [userReview, setUserReview] = useState<BookReview | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>("latest");
    const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");

    // Review form state
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
        if (!bookId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [bookData, reviewsData, userReviewData] = await Promise.all([
                    getBookDetails(bookId),
                    getBookReviews(bookId, sortBy),
                    getUserReview(bookId),
                ]);
                setBook(bookData);
                setReviews(reviewsData.reviews);
                setUserReview(userReviewData);
            } catch (error) {
                console.error("Failed to fetch book details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [bookId, sortBy, submitSuccess]);

    const handleSubmitReview = async () => {
        if (!bookId || rating === 0 || comment.trim().length < 10) return;

        setSubmitting(true);
        setSubmitError(null);

        try {
            const result = await submitBookReview(bookId, rating, comment);
            if (result.success) {
                setSubmitSuccess(true);
                setShowReviewForm(false);
                setRating(0);
                setComment("");
            } else {
                setSubmitError(result.error || "Failed to submit review");
            }
        } catch (error) {
            setSubmitError("An error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!bookId) return null;

    const canReview = book?.userHasCompleted && !book?.userHasReviewed && !userReview;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#241718]/45 p-4 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-[32px] border border-[#eadfda] bg-white soft-shadow">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="focus-ring absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-[#7E1518]/65 shadow-md transition hover:bg-[#F5E7E8] hover:text-[#7E1518]"
                >
                    <X className="h-5 w-5" />
                </button>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-[#7E1518]" />
                    </div>
                ) : book ? (
                    <div className="flex max-h-[90vh] flex-col">
                        {/* Header */}
                        <div className="flex gap-4 bg-gradient-to-r from-[#fffaf4] via-white to-[#EFF8FE] p-6">
                            <div className="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-[#fffaf4] shadow-md">
                                {book.coverUrl ? (
                                    <Image
                                        src={book.coverUrl}
                                        alt={book.title}
                                        fill
                                        className="object-cover"
                                        sizes="112px"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-[#9b898a]">
                                        No cover
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h2 className="heading-font mb-1 text-xl font-extrabold text-[#7E1518]">{book.title}</h2>
                                <p className="mb-2 text-sm font-medium text-[#5d4b4c]">by {book.author}</p>
                                {book.publicationYear && (
                                    <p className="mb-3 text-xs text-gray-500">{book.publicationYear}</p>
                                )}

                                {/* Rating badge */}
                                {book.averageRating && book.averageRating > 0 ? (
                                    <div className="inline-flex items-center gap-2 rounded-full bg-[#FBF2DF] px-3 py-1.5">
                                        <StarRating value={book.averageRating} readonly size="sm" showValue />
                                        <span className="text-xs text-[#7a5311]">({book.reviewCount} reviews)</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-400">No reviews yet</span>
                                )}

                                {/* Read button */}
                                {onReadBook && (
                                    <Link
                                        href={`/dashboard/student/read/${book.id}`}
                                        onClick={() => onReadBook(book.id)}
                                        className="heading-font mt-3 inline-flex items-center gap-2 rounded-full bg-[#7E1518] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#681114]"
                                    >
                                        <BookOpen className="h-4 w-4" />
                                        Read Book
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-[#eadfda]">
                            <button
                                onClick={() => setActiveTab("details")}
                                className={`flex-1 px-4 py-3 text-sm font-bold transition ${activeTab === "details"
                                    ? "border-b-2 border-[#7E1518] text-[#7E1518]"
                                    : "text-[#6f6061] hover:text-[#7E1518]"
                                    }`}
                            >
                                Details
                            </button>
                            <button
                                onClick={() => setActiveTab("reviews")}
                                className={`flex-1 px-4 py-3 text-sm font-bold transition ${activeTab === "reviews"
                                    ? "border-b-2 border-[#7E1518] text-[#7E1518]"
                                    : "text-[#6f6061] hover:text-[#7E1518]"
                                    }`}
                            >
                                Reviews ({book.reviewCount})
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === "details" && (
                                <div className="space-y-4">
                                    {book.description && (
                                        <div>
                                            <h3 className="heading-font mb-2 text-sm font-bold text-[#7E1518]">Description</h3>
                                            <p className="text-sm leading-relaxed text-[#3f3435]">{book.description}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {book.genre && (
                                            <div>
                                                <span className="heading-font font-bold text-[#7E1518]">Genre:</span>{" "}
                                                <span className="text-gray-600">{book.genre}</span>
                                            </div>
                                        )}
                                        {book.language && (
                                            <div>
                                                <span className="heading-font font-bold text-[#7E1518]">Language:</span>{" "}
                                                <span className="text-gray-600">{book.language}</span>
                                            </div>
                                        )}
                                        {book.publisher && (
                                            <div>
                                                <span className="heading-font font-bold text-[#7E1518]">Publisher:</span>{" "}
                                                <span className="text-gray-600">{book.publisher}</span>
                                            </div>
                                        )}
                                        {book.pageCount && (
                                            <div>
                                                <span className="heading-font font-bold text-[#7E1518]">Pages:</span>{" "}
                                                <span className="text-gray-600">{book.pageCount}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === "reviews" && (
                                <div className="space-y-4">
                                    {/* Sort & Write Review */}
                                    <div className="flex items-center justify-between">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                                            className="focus-ring rounded-xl border border-[#eadfda] bg-white px-3 py-1.5 text-sm font-medium text-[#241718]"
                                        >
                                            <option value="latest">Latest</option>
                                            <option value="most_voted">Most Helpful</option>
                                        </select>

                                        {canReview && !showReviewForm && (
                                            <button
                                                onClick={() => setShowReviewForm(true)}
                                                className="heading-font flex items-center gap-1.5 rounded-full bg-[#D6A13A] px-4 py-2 text-sm font-bold text-[#241718] transition hover:bg-[#c28e28]"
                                            >
                                                <Star className="h-4 w-4" />
                                                Write a Review
                                            </button>
                                        )}
                                    </div>

                                    {/* User's own review (pending) */}
                                    {userReview && !submitSuccess && (
                                        <div className="rounded-xl bg-amber-50 p-3">
                                            <p className="mb-2 text-xs font-semibold text-amber-700">Your Review</p>
                                            <ReviewCard review={userReview} isOwnReview />
                                        </div>
                                    )}

                                    {/* Submit success message */}
                                    {submitSuccess && (
                                        <div className="rounded-xl bg-green-50 p-4 text-center">
                                            <p className="font-semibold text-green-700">
                                                ✅ Your review has been submitted and is awaiting moderation.
                                            </p>
                                        </div>
                                    )}

                                    {/* Review form */}
                                    {showReviewForm && (
                                        <div className="rounded-2xl border border-[#eadfda] bg-[#fffaf4] p-4">
                                            <h4 className="heading-font mb-3 font-bold text-[#7E1518]">Write Your Review</h4>

                                            <div className="mb-4">
                                                <label className="heading-font mb-2 block text-sm font-bold text-[#241718]">
                                                    Your Rating
                                                </label>
                                                <StarRating value={rating} onChange={setRating} size="lg" />
                                            </div>

                                            <div className="mb-4">
                                                <label className="heading-font mb-2 block text-sm font-bold text-[#241718]">
                                                    Your Comment (min 10 characters)
                                                </label>
                                                <textarea
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    placeholder="Share your thoughts about this book..."
                                                    rows={4}
                                                    className="focus-ring w-full rounded-xl border border-[#eadfda] p-3 text-sm outline-none transition focus:border-[#D6A13A]"
                                                />
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {comment.length}/10 characters minimum
                                                </p>
                                            </div>

                                            {submitError && (
                                                <p className="mb-3 text-sm text-red-600">{submitError}</p>
                                            )}

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setShowReviewForm(false)}
                                                    className="rounded-full border-2 border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSubmitReview}
                                                    disabled={submitting || rating === 0 || comment.trim().length < 10}
                                                    className="heading-font flex-1 rounded-full bg-[#7E1518] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#681114] disabled:cursor-not-allowed disabled:opacity-50"
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

                                    {/* Reviews list */}
                                    {reviews.length > 0 ? (
                                        <div className="space-y-3">
                                            {reviews
                                                .filter((r) => r.id !== userReview?.id)
                                                .map((review) => (
                                                    <ReviewCard
                                                        key={review.id}
                                                        review={review}
                                                        isOwnReview={review.studentId === userReview?.studentId}
                                                    />
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center">
                                            <MessageSquare className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                                            <p className="text-sm text-gray-500">No reviews yet. Be the first!</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-red-600">Failed to load book details.</div>
                )}
            </div>
        </div>
    );
}
