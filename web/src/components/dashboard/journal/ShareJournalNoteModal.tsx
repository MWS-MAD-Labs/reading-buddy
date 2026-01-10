"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, School } from "lucide-react";
import type { JournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { getClassroomsForBook, shareNoteToClassroom } from "@/app/(dashboard)/dashboard/student/classrooms/[classId]/classroom-stream-actions";

interface ShareJournalNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    entry: JournalEntry;
}

export function ShareJournalNoteModal({ isOpen, onClose, entry }: ShareJournalNoteModalProps) {
    const [classrooms, setClassrooms] = useState<{ id: number; name: string }[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [comment, setComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadClassrooms(entry.book_id);
            setComment("");
        }
    }, [isOpen, entry]);

    const loadClassrooms = async (bookId?: number | null) => {
        setIsLoading(true);
        try {
            const data = await getClassroomsForBook(bookId);
            setClassrooms(data);
            if (data.length === 1) {
                setSelectedClassId(data[0].id);
            } else {
                setSelectedClassId(null);
            }
        } catch (error) {
            console.error("Failed to load classrooms", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        if (!selectedClassId) return;

        setIsSharing(true);
        try {
            await shareNoteToClassroom({
                noteId: entry.id,
                classId: selectedClassId,
                additionalComment: comment
            });
            alert("Note shared to classroom successfully!");
            onClose();
        } catch (error) {
            console.error("Failed to share note", error);
            alert("Failed to share note. Please try again.");
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-950">
                        <Share2 className="h-5 w-5" />
                        Share to Classroom
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                        </div>
                    ) : (
                        <>
                            <div className="px-1 mb-2">
                                <p className="text-sm text-slate-500">
                                    {entry.book_id
                                        ? "Select a classroom where this book is assigned."
                                        : "Select a classroom to share this general note."}
                                </p>
                            </div>

                            {classrooms.length === 0 ? (
                                <div className="text-center py-6 text-slate-500">
                                    <p>You are not enrolled in any classrooms.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Select Classroom</label>
                                        {classrooms.length === 1 ? (
                                            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-900">
                                                <School className="h-4 w-4 text-indigo-500" />
                                                <span className="font-medium">{classrooms[0].name}</span>
                                            </div>
                                        ) : (
                                            <div className="grid gap-2">
                                                {classrooms.map(cls => (
                                                    <button
                                                        key={cls.id}
                                                        onClick={() => setSelectedClassId(cls.id)}
                                                        className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${selectedClassId === cls.id
                                                                ? "bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400"
                                                                : "hover:bg-slate-50 border-slate-200"
                                                            }`}
                                                    >
                                                        <School className={`h-4 w-4 ${selectedClassId === cls.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                                        <span className={`text-sm ${selectedClassId === cls.id ? 'text-indigo-900 font-medium' : 'text-slate-600'}`}>
                                                            {cls.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Add a Comment (Optional)</label>
                                        <textarea
                                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[80px]"
                                            placeholder="Why are you sharing this note?"
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSharing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleShare}
                        disabled={!selectedClassId || isSharing || classrooms.length === 0}
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
            </DialogContent>
        </Dialog>
    );
}
