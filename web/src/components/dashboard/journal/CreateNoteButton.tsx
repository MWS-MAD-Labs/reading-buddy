"use client";

import { useState } from "react";
import { createJournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";

export function CreateNoteButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            await createJournalEntry({
                entryType: "note",
                content: content.trim(),
            });
            setContent("");
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to create note:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:scale-105"
            >
                ✏️ New Note
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-indigo-950">📝 New Note</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-full p-1 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind about your reading? Share a thought, reflection, or question..."
                        className="mb-4 h-32 w-full resize-none rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-indigo-900 placeholder-indigo-300 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        autoFocus
                    />

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="rounded-full px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!content.trim() || isSubmitting}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {isSubmitting ? "Saving..." : "Save Note"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
