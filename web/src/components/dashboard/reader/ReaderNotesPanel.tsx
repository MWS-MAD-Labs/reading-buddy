"use client";

import { useState, useEffect, useCallback } from "react";
import {
    createQuickNote,
    getJournalEntries,
    deleteJournalEntry,
    type JournalEntry,
} from "@/app/(dashboard)/dashboard/journal/journal-actions";

interface ReaderNotesPanelProps {
    bookId: number;
    currentPage: number;
    isOpen: boolean;
    onClose: () => void;
    onPageJump?: (page: number) => void;
}

export function ReaderNotesPanel({
    bookId,
    currentPage,
    isOpen,
    onClose,
    onPageJump,
}: ReaderNotesPanelProps) {
    const [notes, setNotes] = useState<JournalEntry[]>([]);
    const [newNote, setNewNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch notes for this book
    const fetchNotes = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getJournalEntries({
                bookId,
                entryType: "note",
                limit: 100,
            });
            setNotes(result.entries);
        } catch (err) {
            console.error("Failed to fetch notes:", err);
        } finally {
            setIsLoading(false);
        }
    }, [bookId]);

    useEffect(() => {
        if (isOpen) {
            fetchNotes();
        }
    }, [isOpen, fetchNotes]);

    const handleSaveNote = async () => {
        if (!newNote.trim()) return;

        setIsSaving(true);
        setError(null);

        try {
            const entry = await createQuickNote({
                bookId,
                pageNumber: currentPage,
                content: newNote.trim(),
            });
            setNotes((prev) => [entry, ...prev]);
            setNewNote("");
        } catch (err) {
            setError("Failed to save note. Please try again.");
            console.error("Failed to save note:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteJournalEntry(noteId);
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
        } catch (err) {
            console.error("Failed to delete note:", err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleSaveNote();
        }
    };

    // Group notes by page
    const notesForCurrentPage = notes.filter((n) => n.page_number === currentPage);
    const otherNotes = notes.filter((n) => n.page_number !== currentPage);

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div
                className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm transform border-l border-indigo-100 bg-white/95 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-indigo-100 p-4">
                    <div>
                        <h2 className="text-lg font-bold text-indigo-950">📝 My Notes</h2>
                        <p className="text-xs text-indigo-400">
                            Page {currentPage} • {notes.length} total notes
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* New Note Input */}
                <div className="border-b border-indigo-100 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-indigo-500">
                        <button
                            onClick={() => onPageJump?.(currentPage)}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 transition-colors hover:bg-indigo-200"
                        >
                            📍 Page {currentPage}
                        </button>
                    </div>
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a note about this page..."
                        className="mb-2 h-24 w-full resize-none rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-sm text-indigo-900 placeholder-indigo-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-indigo-300">⌘/Ctrl + Enter to save</p>
                        <button
                            onClick={handleSaveNote}
                            disabled={!newNote.trim() || isSaving}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isSaving ? "Saving..." : "Save Note"}
                        </button>
                    </div>
                    {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                </div>

                {/* Notes List */}
                <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 280px)" }}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="py-8 text-center">
                            <div className="mb-2 text-4xl">📝</div>
                            <p className="text-sm text-indigo-400">
                                No notes yet for this book.
                            </p>
                            <p className="text-xs text-indigo-300">
                                Start capturing your thoughts!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Current Page Notes */}
                            {notesForCurrentPage.length > 0 && (
                                <div>
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                                        This Page
                                    </h3>
                                    <div className="space-y-2">
                                        {notesForCurrentPage.map((note) => (
                                            <NoteItem
                                                key={note.id}
                                                note={note}
                                                onDelete={handleDeleteNote}
                                                onPageJump={onPageJump}
                                                isCurrent
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Other Notes */}
                            {otherNotes.length > 0 && (
                                <div>
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-400">
                                        Other Pages
                                    </h3>
                                    <div className="space-y-2">
                                        {otherNotes.map((note) => (
                                            <NoteItem
                                                key={note.id}
                                                note={note}
                                                onDelete={handleDeleteNote}
                                                onPageJump={onPageJump}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function NoteItem({
    note,
    onDelete,
    onPageJump,
    isCurrent = false,
}: {
    note: JournalEntry;
    onDelete: (id: string) => void;
    onPageJump?: (page: number) => void;
    isCurrent?: boolean;
}) {
    const [showConfirm, setShowConfirm] = useState(false);

    const time = new Date(note.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });

    return (
        <div
            className={`rounded-xl border p-3 ${isCurrent
                ? "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50"
                : "border-indigo-100 bg-white/60"
                }`}
        >
            <div className="mb-1 flex items-start justify-between gap-2">
                <button
                    onClick={() => note.page_number && onPageJump?.(note.page_number)}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${isCurrent
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                        }`}
                >
                    📍 Page {note.page_number}
                </button>
                <span className="text-xs text-indigo-400">{time}</span>
            </div>
            <p className="mb-2 text-sm text-indigo-900 whitespace-pre-wrap">
                {note.content}
            </p>
            <div className="flex justify-end">
                {showConfirm ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onDelete(note.id)}
                            className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 hover:bg-red-200"
                        >
                            Delete
                        </button>
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="text-xs text-indigo-300 hover:text-red-400"
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
}
