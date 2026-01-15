"use client";

import Link from "next/link";
import { useState } from "react";
import { Share2, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, Star, MessageSquare } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import type { JournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { deleteJournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { resubmitReview } from "@/app/(dashboard)/dashboard/library/review-actions";
import { ShareJournalNoteModal } from "./ShareJournalNoteModal";

interface JournalEntryCardProps {
    entry: JournalEntry;
}

const entryTypeConfig: Record<
    string,
    { icon: string; label: string; bgColor: string; borderColor: string }
> = {
    note: {
        icon: "📝",
        label: "Note",
        bgColor: "from-amber-50 to-yellow-50",
        borderColor: "border-amber-200",
    },
    reading_session: {
        icon: "📖",
        label: "Reading Session",
        bgColor: "from-blue-50 to-cyan-50",
        borderColor: "border-blue-200",
    },
    achievement: {
        icon: "🏆",
        label: "Achievement",
        bgColor: "from-purple-50 to-pink-50",
        borderColor: "border-purple-200",
    },
    quote: {
        icon: "💬",
        label: "Quote",
        bgColor: "from-green-50 to-emerald-50",
        borderColor: "border-green-200",
    },
    question: {
        icon: "❓",
        label: "Question",
        bgColor: "from-rose-50 to-pink-50",
        borderColor: "border-rose-200",
    },
    started_book: {
        icon: "📚",
        label: "Started Reading",
        bgColor: "from-indigo-50 to-sky-50",
        borderColor: "border-indigo-200",
    },
    finished_book: {
        icon: "✅",
        label: "Finished Book",
        bgColor: "from-green-50 to-teal-50",
        borderColor: "border-green-200",
    },
};

export function JournalEntryCard({ entry: initialEntry }: JournalEntryCardProps) {
    const [entry, setEntry] = useState(initialEntry);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    // Review editing state
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [editRating, setEditRating] = useState(entry.review_rating || 0);
    const [editComment, setEditComment] = useState(entry.review_comment || "");
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const config = entryTypeConfig[entry.entry_type] ?? {
        icon: "📋",
        label: "Entry",
        bgColor: "from-gray-50 to-slate-50",
        borderColor: "border-gray-200",
    };

    const time = new Date(entry.created_at).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteJournalEntry(entry.id);
        } catch (error) {
            console.error("Failed to delete entry:", error);
            setIsDeleting(false);
            setShowConfirmDelete(false);
        }
    };

    const handleResubmitReview = async () => {
        if (!entry.review_id || editRating === 0 || editComment.trim().length < 10) {
            setSubmitError("Please provide a rating and comment (min 10 characters).");
            return;
        }

        setIsSubmittingReview(true);
        setSubmitError(null);

        try {
            const result = await resubmitReview(entry.review_id, editRating, editComment);
            if (result.success) {
                setEntry((prev) => ({
                    ...prev,
                    review_rating: editRating,
                    review_comment: editComment,
                    review_status: "PENDING",
                    review_rejection_feedback: null,
                }));
                setIsEditingReview(false);
            } else {
                setSubmitError(result.error || "Failed to resubmit review");
            }
        } catch (error) {
            setSubmitError("An error occurred. Please try again.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        <Clock className="h-3 w-3" /> Pending Review
                    </span>
                );
            case "APPROVED":
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                        <CheckCircle className="h-3 w-3" /> Approved
                    </span>
                );
            case "REJECTED":
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                        <XCircle className="h-3 w-3" /> Needs Revision
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className={`relative rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:shadow-md ${config.bgColor} ${config.borderColor}`}
        >
            {/* Timeline dot */}
            <div className={`absolute -left-[2.55rem] top-4 h-3 w-3 rounded-full ring-4 ring-white ${entry.review_status === 'REJECTED' ? 'bg-red-400' : 'bg-indigo-400'}`} />

            {/* Header */}
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                        {config.label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {entry.review_status && getStatusBadge(entry.review_status)}
                    <span className="text-xs text-indigo-400">{time}</span>
                </div>
            </div>

            {/* Content */}
            {entry.content && (
                <p className="mb-3 text-sm text-indigo-900 whitespace-pre-wrap">
                    {entry.entry_type === "quote" ? (
                        <span className="italic">&ldquo;{entry.content}&rdquo;</span>
                    ) : (
                        entry.content
                    )}
                </p>
            )}

            {/* Finished Book Review Section */}
            {entry.entry_type === "finished_book" && entry.review_status && (
                <div className="mb-3 rounded-xl bg-white/60 p-3">
                    {/* Rejection Feedback */}
                    {entry.review_status === "REJECTED" && entry.review_rejection_feedback && !isEditingReview && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-red-700">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Librarian Feedback
                            </div>
                            <p className="mb-2 text-xs text-red-600">{entry.review_rejection_feedback}</p>
                            <button
                                onClick={() => {
                                    setIsEditingReview(true);
                                    setEditRating(entry.review_rating || 0);
                                    setEditComment(entry.review_comment || "");
                                    setSubmitError(null);
                                }}
                                className="text-xs font-bold text-red-600 underline hover:text-red-700"
                            >
                                Revise Review
                            </button>
                        </div>
                    )}

                    {isEditingReview ? (
                        <div className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-indigo-700">Rating</label>
                                <StarRating value={editRating} onChange={setEditRating} size="md" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-bold text-indigo-700">Comment (min 10 chars)</label>
                                <textarea
                                    value={editComment}
                                    onChange={(e) => setEditComment(e.target.value)}
                                    className="w-full rounded-lg border border-indigo-200 p-2 text-sm focus:border-indigo-400 focus:outline-none"
                                    rows={3}
                                />
                            </div>
                            {submitError && <p className="text-xs font-bold text-red-600">{submitError}</p>}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleResubmitReview()}
                                    disabled={isSubmittingReview || editRating === 0 || editComment.trim().length < 10}
                                    className="rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-600 disabled:opacity-50"
                                >
                                    {isSubmittingReview ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit Revision"}
                                </button>
                                <button
                                    onClick={() => setIsEditingReview(false)}
                                    className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-2 flex items-center gap-2">
                                <StarRating value={entry.review_rating || 0} size="sm" readonly />
                            </div>
                            {entry.review_comment && (
                                <div className="flex gap-2">
                                    <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-indigo-400" />
                                    <p className="text-sm text-gray-600 italic">&ldquo;{entry.review_comment}&rdquo;</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Reading session details */}
            {entry.entry_type === "reading_session" && (
                <div className="mb-3 flex flex-wrap gap-3 text-xs text-indigo-600">
                    {entry.page_range_start && entry.page_range_end && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-1">
                            📄 Pages {entry.page_range_start} → {entry.page_range_end}
                        </span>
                    )}
                    {entry.reading_duration_minutes && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-1">
                            ⏱️ {entry.reading_duration_minutes} min
                        </span>
                    )}
                </div>
            )}

            {/* Page reference */}
            {entry.page_number && entry.entry_type !== "reading_session" && (
                <p className="mb-3 text-xs text-indigo-500">
                    📍 Page {entry.page_number}
                </p>
            )}

            {/* Book link */}
            {entry.book_id && entry.book_title && (
                <div className="flex items-center gap-2 rounded-xl bg-white/60 p-2">
                    {entry.book_cover_url && (
                        <img
                            src={entry.book_cover_url}
                            alt={entry.book_title}
                            className="h-10 w-7 rounded object-cover"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <Link
                            href={`/dashboard/journal/${entry.book_id}`}
                            className="block truncate text-sm font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                        >
                            {entry.book_title}
                        </Link>
                        {entry.book_author && (
                            <p className="truncate text-xs text-indigo-400">
                                by {entry.book_author}
                            </p>
                        )}
                    </div>
                    <Link
                        href={`/dashboard/student/read/${entry.book_id}${entry.page_number ? `?page=${entry.page_number}` : ""}`}
                        className="shrink-0 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-200"
                    >
                        Open
                    </Link>
                </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center justify-between">
                {/* Share Button (only for notes) */}
                {entry.entry_type === "note" && (
                    <button
                        onClick={() => setShowShareModal(true)}
                        className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                        <Share2 className="h-3.5 w-3.5" />
                        Share to Classroom
                    </button>
                )}

                {/* Delete Action */}
                <div className="ml-auto flex justify-end">
                    {showConfirmDelete ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-red-500">Delete this entry?</span>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                            >
                                {isDeleting ? "..." : "Yes"}
                            </button>
                            <button
                                onClick={() => setShowConfirmDelete(false)}
                                className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-300"
                            >
                                No
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowConfirmDelete(true)}
                            className="text-xs text-indigo-400 hover:text-red-500"
                        >
                            🗑️ Delete
                        </button>
                    )}
                </div>
            </div>

            <ShareJournalNoteModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                entry={entry}
            />
        </div>
    );
}
