"use client";

import { useState } from "react";
import { updateBookJournal, type BookJournal } from "@/app/(dashboard)/dashboard/journal/journal-actions";

interface BookJournalHeaderProps {
    book: {
        id: number;
        title: string;
        author?: string;
        cover_url?: string;
        page_count?: number;
    };
    progress?: {
        current_page: number;
        completed: boolean;
        completed_at?: string;
        started_at?: string;
    } | null;
    bookJournal: BookJournal | null;
}

export function BookJournalHeader({ book, progress, bookJournal }: BookJournalHeaderProps) {
    const [rating, setRating] = useState(bookJournal?.personal_rating ?? 0);
    const [isSavingRating, setIsSavingRating] = useState(false);

    const progressPercent = book.page_count && progress?.current_page
        ? Math.min(100, Math.round((progress.current_page / book.page_count) * 100))
        : 0;

    const handleRatingChange = async (newRating: number) => {
        setRating(newRating);
        setIsSavingRating(true);
        try {
            await updateBookJournal({
                bookId: book.id,
                personalRating: newRating,
            });
        } catch (error) {
            console.error("Failed to save rating:", error);
            setRating(bookJournal?.personal_rating ?? 0);
        } finally {
            setIsSavingRating(false);
        }
    };

    return (
        <div className="rounded-[28px] border border-white/70 bg-gradient-to-br from-white via-amber-50 to-orange-50 p-6 shadow-lg">
            <div className="flex flex-col gap-6 sm:flex-row">
                {/* Book Cover */}
                {book.cover_url && (
                    <div className="flex-shrink-0">
                        <img
                            src={book.cover_url}
                            alt={book.title}
                            className="h-40 w-28 rounded-xl object-cover shadow-md sm:h-48 sm:w-32"
                        />
                    </div>
                )}

                {/* Book Info */}
                <div className="flex-1 space-y-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-500">
                            📓 Book Journal
                        </p>
                        <h1 className="text-2xl font-black text-indigo-950">{book.title}</h1>
                        {book.author && (
                            <p className="text-sm text-indigo-500">by {book.author}</p>
                        )}
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-indigo-600">
                                {progress?.completed ? (
                                    <span className="flex items-center gap-1 font-semibold text-green-600">
                                        ✅ Completed
                                    </span>
                                ) : (
                                    <>
                                        Page {progress?.current_page ?? 0} of {book.page_count ?? "?"}
                                    </>
                                )}
                            </span>
                            <span className="font-bold text-indigo-700">{progressPercent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
                            <div
                                className={`h-full rounded-full transition-all ${progress?.completed
                                        ? "bg-gradient-to-r from-green-400 to-emerald-400"
                                        : "bg-gradient-to-r from-indigo-400 to-sky-400"
                                    }`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-indigo-500">My Rating:</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => handleRatingChange(star)}
                                    disabled={isSavingRating}
                                    className={`text-2xl transition hover:scale-110 ${star <= rating ? "text-amber-400" : "text-gray-300"
                                        } disabled:opacity-50`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                        {isSavingRating && (
                            <span className="text-xs text-indigo-400">Saving...</span>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-3">
                        {progress?.started_at && (
                            <div className="rounded-xl bg-white/60 px-3 py-1.5">
                                <p className="text-xs text-indigo-400">Started</p>
                                <p className="text-sm font-medium text-indigo-700">
                                    {new Date(progress.started_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                            </div>
                        )}
                        {progress?.completed_at && (
                            <div className="rounded-xl bg-white/60 px-3 py-1.5">
                                <p className="text-xs text-indigo-400">Finished</p>
                                <p className="text-sm font-medium text-indigo-700">
                                    {new Date(progress.completed_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                            </div>
                        )}
                        <div className="rounded-xl bg-white/60 px-3 py-1.5">
                            <p className="text-xs text-indigo-400">Notes</p>
                            <p className="text-sm font-medium text-indigo-700">
                                {bookJournal?.notes_count ?? 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
