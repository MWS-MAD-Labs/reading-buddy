"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createJournalEntry,
  createQuickNote,
  getJournalBookOptions,
  saveQuestion,
  saveQuote,
  type JournalBookOption,
  type JournalEntry,
  type JournalEntryType,
} from "@/app/(dashboard)/dashboard/journal/journal-actions";
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
import { cn } from "@/lib/cn";

type ComposerMode = "reflection" | "book-entry";
type CapturableEntryType = Extract<JournalEntryType, "note" | "quote" | "question">;

interface JournalEntryComposerProps {
  triggerLabel: string;
  title: string;
  description: string;
  mode: ComposerMode;
  fixedBook?: JournalBookOption;
  defaultEntryType?: CapturableEntryType;
  defaultPageNumber?: number;
  triggerVariant?: "primary" | "secondary" | "outline" | "ghost" | "neutral";
  triggerSize?: "sm" | "md" | "lg";
  className?: string;
  onCreated?: (entry: JournalEntry) => void;
}

const entryTypeOptions: Array<{
  value: CapturableEntryType;
  label: string;
  placeholder: string;
}> = [
  {
    value: "note",
    label: "Note",
    placeholder: "Write a thought or reflection about this book...",
  },
  {
    value: "quote",
    label: "Quote",
    placeholder: "Paste or type a quote you want to remember...",
  },
  {
    value: "question",
    label: "Question",
    placeholder: "Write a question this book raised for you...",
  },
];

export function JournalEntryComposer({
  triggerLabel,
  title,
  description,
  mode,
  fixedBook,
  defaultEntryType = "note",
  defaultPageNumber,
  triggerVariant = "primary",
  triggerSize = "md",
  className,
  onCreated,
}: JournalEntryComposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [books, setBooks] = useState<JournalBookOption[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(
    fixedBook?.id ?? null,
  );
  const [entryType, setEntryType] = useState<CapturableEntryType>(defaultEntryType);
  const [content, setContent] = useState("");
  const [pageNumber, setPageNumber] = useState(
    defaultPageNumber ? String(defaultPageNumber) : "",
  );
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBook = useMemo(() => {
    if (fixedBook) return fixedBook;
    return books.find((book) => book.id === selectedBookId) ?? null;
  }, [books, fixedBook, selectedBookId]);

  const currentEntryOption =
    entryTypeOptions.find((option) => option.value === entryType) ??
    entryTypeOptions[0];

  useEffect(() => {
    if (!isOpen || mode !== "book-entry" || fixedBook) return;

    setIsLoadingBooks(true);
    getJournalBookOptions()
      .then((bookOptions) => {
        setBooks(bookOptions);
        if (!selectedBookId && bookOptions.length === 1) {
          setSelectedBookId(bookOptions[0].id);
          if (bookOptions[0].current_page) {
            setPageNumber(String(bookOptions[0].current_page));
          }
        }
      })
      .catch((loadError) => {
        console.error("Failed to load journal books:", loadError);
        setError("Could not load your books. Please try again.");
      })
      .finally(() => setIsLoadingBooks(false));
  }, [fixedBook, isOpen, mode, selectedBookId]);

  useEffect(() => {
    if (!isOpen) return;
    setEntryType(defaultEntryType);
    setSelectedBookId(fixedBook?.id ?? null);
    setPageNumber(defaultPageNumber ? String(defaultPageNumber) : "");
    setContent("");
    setError(null);
  }, [defaultEntryType, defaultPageNumber, fixedBook?.id, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    const parsedPageNumber = pageNumber.trim()
      ? Number.parseInt(pageNumber.trim(), 10)
      : undefined;

    if (pageNumber.trim() && (!parsedPageNumber || parsedPageNumber < 1)) {
      setError("Page number must be a positive number.");
      return;
    }

    if (mode === "book-entry" && !selectedBookId) {
      setError("Choose a book before saving this journal entry.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let entry: JournalEntry;

      if (mode === "reflection") {
        entry = await createJournalEntry({
          entryType: "note",
          content: trimmedContent,
          metadata: { scope: "general_reflection" },
        });
      } else if (entryType === "quote") {
        entry = await saveQuote({
          bookId: selectedBookId!,
          pageNumber: parsedPageNumber,
          quote: trimmedContent,
        });
      } else if (entryType === "question") {
        entry = await saveQuestion({
          bookId: selectedBookId!,
          pageNumber: parsedPageNumber,
          question: trimmedContent,
        });
      } else if (parsedPageNumber) {
        entry = await createQuickNote({
          bookId: selectedBookId!,
          pageNumber: parsedPageNumber,
          content: trimmedContent,
        });
      } else {
        entry = await createJournalEntry({
          entryType: "note",
          bookId: selectedBookId!,
          content: trimmedContent,
        });
      }

      onCreated?.(entry);
      setContent("");
      setIsOpen(false);
    } catch (submitError) {
      console.error("Failed to save journal entry:", submitError);
      setError("Could not save this journal entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookChange = (value: string) => {
    const nextBookId = value ? Number.parseInt(value, 10) : null;
    setSelectedBookId(nextBookId);

    const nextBook = books.find((book) => book.id === nextBookId);
    if (nextBook?.current_page && !pageNumber) {
      setPageNumber(String(nextBook.current_page));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        type="button"
        size={triggerSize}
        variant={triggerVariant}
        onClick={() => setIsOpen(true)}
        className={className}
      >
        {triggerLabel}
      </Button>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "book-entry" && (
            <div className="space-y-2">
              <Label>Book</Label>
              {fixedBook ? (
                <div className="rounded-2xl border border-[#eadfda] bg-[#fffaf4] px-4 py-3 text-sm font-bold text-[#7E1518]">
                  {fixedBook.title}
                  {fixedBook.author && (
                    <span className="ml-1 font-medium text-[#6f6061]">
                      by {fixedBook.author}
                    </span>
                  )}
                </div>
              ) : (
                <select
                  value={selectedBookId ?? ""}
                  onChange={(event) => handleBookChange(event.target.value)}
                  disabled={isLoadingBooks}
                  className="focus-ring w-full rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-sm font-medium text-[#241718] transition focus-visible:border-[#D6A13A]"
                >
                  <option value="">
                    {isLoadingBooks ? "Loading books..." : "Choose a book"}
                  </option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title}
                      {book.author ? ` by ${book.author}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {mode === "book-entry" && (
            <div className="space-y-2">
              <Label>Entry type</Label>
              <div className="grid grid-cols-3 gap-2">
                {entryTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setEntryType(option.value)}
                    className={cn(
                      "focus-ring rounded-2xl border px-3 py-2 text-sm font-bold transition",
                      entryType === option.value
                        ? "border-[#D6A13A] bg-[#FBF2DF] text-[#7E1518]"
                        : "border-[#eadfda] bg-white text-[#5d4b4c] hover:bg-[#fffaf4]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "book-entry" && (
            <div className="space-y-2">
              <Label>Page number optional</Label>
              <input
                value={pageNumber}
                onChange={(event) => setPageNumber(event.target.value)}
                inputMode="numeric"
                placeholder={selectedBook?.current_page ? String(selectedBook.current_page) : "Page"}
                className="focus-ring w-full rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-sm font-medium text-[#241718] placeholder:text-[#9b898a] transition focus-visible:border-[#D6A13A]"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{mode === "reflection" ? "Reflection" : currentEntryOption.label}</Label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={
                mode === "reflection"
                  ? "Write a general reflection about your reading journey..."
                  : currentEntryOption.placeholder
              }
              className="focus-ring h-32 w-full resize-none rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-sm font-medium text-[#241718] placeholder:text-[#9b898a] transition focus-visible:border-[#D6A13A]"
            />
          </div>

          {error && <p className="text-sm font-medium text-[#B94A4E]">{error}</p>}

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
              disabled={
                !content.trim() ||
                isSubmitting ||
                (mode === "book-entry" && !selectedBookId)
              }
              loading={isSubmitting}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
