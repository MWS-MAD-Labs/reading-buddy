"use client";

import Link from "next/link";
import { useState } from "react";
import type { JournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { deleteJournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";

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

export function JournalEntryCard({ entry }: JournalEntryCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

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

    return (
        <div
            className={`relative rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:shadow-md ${config.bgColor} ${config.borderColor}`}
        >
            {/* Timeline dot */}
            <div className="absolute -left-[2.55rem] top-4 h-3 w-3 rounded-full bg-indigo-400 ring-4 ring-white" />

            {/* Header */}
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{config.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                        {config.label}
                    </span>
                </div>
                <span className="text-xs text-indigo-400">{time}</span>
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

            {/* Delete action */}
            <div className="mt-3 flex justify-end">
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
    );
}
