"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSharableNotes, SharableNote } from "@/app/(dashboard)/dashboard/student/classrooms/[classId]/classroom-stream-actions";
import { Loader2, BookOpen, FileText } from "lucide-react";

interface ShareNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number;
    onShare: (note: SharableNote, comment: string) => Promise<void>;
}

export function ShareNoteModal({ isOpen, onClose, classId, onShare }: ShareNoteModalProps) {
    const [notes, setNotes] = useState<SharableNote[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedNote, setSelectedNote] = useState<SharableNote | null>(null);
    const [comment, setComment] = useState("");
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadNotes();
            setSelectedNote(null);
            setComment("");
        }
    }, [isOpen]);

    const loadNotes = async () => {
        setIsLoading(true);
        try {
            const data = await getSharableNotes(classId);
            setNotes(data);
        } catch (error) {
            console.error("Failed to load notes", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        if (!selectedNote) return;

        setIsSharing(true);
        try {
            await onShare(selectedNote, comment);
            onClose();
        } catch (error) {
            console.error("Failed to share note", error);
        } finally {
            setIsSharing(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-xl text-indigo-950">Share a Note</DialogTitle>
                    <p className="text-sm text-indigo-500">
                        Select a note from your reading journal to share with the class.
                        Only notes from books assigned to this class are shown.
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-2">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="text-center py-12 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50">
                            <FileText className="h-10 w-10 mx-auto text-indigo-300 mb-2" />
                            <p className="text-indigo-600 font-medium">No sharable notes found</p>
                            <p className="text-indigo-400 text-sm mt-1">
                                You haven't taken any notes yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {notes.map((note) => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedNote(note)}
                                    className={`
                    cursor-pointer rounded-xl border p-4 transition-all
                    ${selectedNote?.id === note.id
                                            ? 'border-indigo-400 bg-indigo-50 shadow-md ring-1 ring-indigo-400'
                                            : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                                        }
                  `}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-100 rounded-full px-2 py-0.5">
                                            <BookOpen className="h-3 w-3" />
                                            {note.book_title || "General Note"}
                                        </div>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">
                                            {formatDate(note.created_at)}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-700 line-clamp-2 mb-2">
                                        {note.content}
                                    </p>

                                    {note.page_number && (
                                        <p className="text-xs text-slate-400">
                                            Page {note.page_number}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 pt-4 bg-white border-t space-y-4">
                    {selectedNote && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-indigo-900">
                                Add a comment (optional)
                            </label>
                            <input
                                type="text"
                                placeholder="Why are you sharing this note?"
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={onClose} disabled={isSharing}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleShare}
                            disabled={!selectedNote || isSharing}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSharing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sharing...
                                </>
                            ) : (
                                "Share Note"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
