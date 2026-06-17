"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import type { JournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import {
  getClassroomsForBook,
  shareNoteToClassroom,
} from "@/app/(dashboard)/dashboard/student/classrooms/[classId]/classroom-stream-actions";
import { cn } from "@/lib/cn";

interface ShareJournalNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: JournalEntry;
}

export function ShareJournalNoteModal({
  isOpen,
  onClose,
  entry,
}: ShareJournalNoteModalProps) {
  const [classrooms, setClassrooms] = useState<{ id: number; name: string }[]>(
    [],
  );
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
        additionalComment: comment,
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
          <DialogTitle>Share to Classroom</DialogTitle>
          <DialogDescription>
            {entry.book_id
              ? "Select a classroom where this book is assigned."
              : "Select a classroom to share this general note."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#D6A13A]" />
            </div>
          ) : classrooms.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#D6A13A]/60 bg-[#fffaf4] p-6 text-center text-sm text-[#5d4b4c]">
              You are not enrolled in any classrooms.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Classroom</Label>
                {classrooms.length === 1 ? (
                  <div className="rounded-2xl border border-[#eadfda] bg-[#EFF8FE] p-3 text-[#241718]">
                    <span className="font-medium">{classrooms[0].name}</span>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {classrooms.map((cls) => (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => setSelectedClassId(cls.id)}
                        className={cn(
                          "focus-ring flex items-center gap-2 rounded-2xl border p-3 text-left transition-all",
                          selectedClassId === cls.id
                            ? "border-[#D6A13A] bg-[#FBF2DF] ring-1 ring-[#D6A13A]"
                            : "border-[#eadfda] bg-white hover:bg-[#fffaf4]",
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm",
                            selectedClassId === cls.id
                              ? "font-bold text-[#7E1518]"
                              : "font-medium text-[#5d4b4c]",
                          )}
                        >
                          {cls.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Add a Comment (Optional)</Label>
                <textarea
                  className="focus-ring min-h-20 w-full rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-sm font-medium text-[#241718] placeholder:text-[#9b898a] transition focus-visible:border-[#D6A13A]"
                  placeholder="Why are you sharing this note?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSharing}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={!selectedClassId || classrooms.length === 0}
            loading={isSharing}
          >
            Share Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
