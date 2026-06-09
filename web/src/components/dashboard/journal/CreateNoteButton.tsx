"use client";

import { useState } from "react";
import { createJournalEntry } from "@/app/(dashboard)/dashboard/journal/journal-actions";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button type="button" size="md" onClick={() => setIsOpen(true)}>
        New Note
      </Button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Note</DialogTitle>
          <DialogDescription>
            Capture a thought, reflection, quote, or question from your reading.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind about your reading?"
            className="focus-ring h-32 w-full resize-none rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-sm font-medium text-[#241718] placeholder:text-[#9b898a] transition focus-visible:border-[#D6A13A]"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!content.trim()}
              loading={isSubmitting}
            >
              Save Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
