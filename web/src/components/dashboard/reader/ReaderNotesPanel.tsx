"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createQuickNote,
  deleteJournalEntry,
  getJournalEntries,
  saveQuestion,
  saveQuote,
  type JournalEntry,
  type JournalEntryType,
} from "@/app/(dashboard)/dashboard/journal/journal-actions";
import { cn } from "@/lib/cn";

interface ReaderNotesPanelProps {
  bookId: number;
  currentPage: number;
  isOpen: boolean;
  onClose: () => void;
  onPageJump?: (page: number) => void;
}

type CapturableEntryType = Extract<
  JournalEntryType,
  "note" | "quote" | "question"
>;

const entryTypeConfig: Record<
  CapturableEntryType,
  {
    label: string;
    icon: string;
    placeholder: string;
    activeClassName: string;
    badgeClassName: string;
    cardClassName: string;
  }
> = {
  note: {
    label: "Note",
    icon: "📝",
    placeholder: "Write a note about this page...",
    activeClassName: "border-[#D6A13A] bg-[#FBF2DF] text-[#7E1518]",
    badgeClassName: "bg-[#FBF2DF] text-[#7a5311]",
    cardClassName: "border-[#D6A13A]/35 bg-[#fffaf4]",
  },
  quote: {
    label: "Quote",
    icon: "💬",
    placeholder: "Save a quote from this page...",
    activeClassName: "border-[#B8DDF8] bg-[#EFF8FE] text-[#1F2A44]",
    badgeClassName: "bg-[#EFF8FE] text-[#25638e]",
    cardClassName: "border-[#B8DDF8]/55 bg-[#EFF8FE]",
  },
  question: {
    label: "Question",
    icon: "❓",
    placeholder: "Ask a question this page raised for you...",
    activeClassName: "border-[#B8DDF8] bg-[#EFF8FE] text-[#1F2A44]",
    badgeClassName: "bg-[#EFF8FE] text-[#25638e]",
    cardClassName: "border-[#B8DDF8]/55 bg-white",
  },
};

function isCapturableEntry(entry: JournalEntry) {
  return ["note", "quote", "question"].includes(entry.entry_type);
}

export function ReaderNotesPanel({
  bookId,
  currentPage,
  isOpen,
  onClose,
  onPageJump,
}: ReaderNotesPanelProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [entryType, setEntryType] = useState<CapturableEntryType>("note");
  const [newEntryContent, setNewEntryContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentConfig = entryTypeConfig[entryType];

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getJournalEntries({ bookId, limit: 100 });
      setEntries(result.entries.filter(isCapturableEntry));
    } catch (err) {
      console.error("Failed to fetch journal entries:", err);
    } finally {
      setIsLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    if (isOpen) fetchEntries();
  }, [isOpen, fetchEntries]);

  const handleSaveEntry = async () => {
    const trimmedContent = newEntryContent.trim();
    if (!trimmedContent) return;

    setIsSaving(true);
    setError(null);

    try {
      let entry: JournalEntry;

      if (entryType === "quote") {
        entry = await saveQuote({
          bookId,
          pageNumber: currentPage,
          quote: trimmedContent,
        });
      } else if (entryType === "question") {
        entry = await saveQuestion({
          bookId,
          pageNumber: currentPage,
          question: trimmedContent,
        });
      } else {
        entry = await createQuickNote({
          bookId,
          pageNumber: currentPage,
          content: trimmedContent,
        });
      }

      setEntries((prev) => [entry, ...prev]);
      setNewEntryContent("");
    } catch (err) {
      setError("Could not save this journal entry yet. Please try again.");
      console.error("Failed to save journal entry:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteJournalEntry(entryId);
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      console.error("Failed to delete journal entry:", err);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      handleSaveEntry();
    }
  };

  const entriesForCurrentPage = entries.filter(
    (entry) => entry.page_number === currentPage,
  );
  const otherEntries = entries.filter(
    (entry) => entry.page_number !== currentPage,
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#241718]/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-sm transform border-l border-[#eadfda] bg-white shadow-[0_18px_45px_rgba(36,23,24,0.12)] transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Book journal panel"
      >
        <header className="border-b border-[#eadfda] bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="heading-font mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#D6A13A]">
                Reading journal
              </p>
              <h2 className="heading-font text-2xl font-extrabold tracking-tight text-[#7E1518]">
                Book Journal
              </h2>
              <p className="mt-1 text-sm font-medium text-[#5d4b4c]">
                Page {currentPage} • {entries.length} saved{" "}
                {entries.length === 1 ? "entry" : "entries"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="focus-ring rounded-full p-2 text-[#7E1518] transition hover:bg-[#F5E7E8]"
              aria-label="Close book journal panel"
              type="button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
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
        </header>

        <section
          className="border-b border-[#eadfda] bg-[#fffaf4] px-6 py-5"
          aria-label="Add journal entry"
        >
          <div className="mb-4 flex items-center justify-between gap-3 text-sm">
            <button
              onClick={() => onPageJump?.(currentPage)}
              className="focus-ring heading-font inline-flex items-center gap-2 rounded-full bg-[#FBF2DF] px-3 py-2 text-sm font-bold text-[#7a5311] transition hover:bg-[#f4e3bc]"
              type="button"
            >
              📍 Page {currentPage}
            </button>
            <span className="text-sm font-bold text-[#7E1518]">
              Saved to this book
            </span>
          </div>

          <div
            className="mb-4 grid grid-cols-3 gap-2"
            role="tablist"
            aria-label="Journal entry type"
          >
            {(Object.keys(entryTypeConfig) as CapturableEntryType[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={entryType === type}
                  onClick={() => setEntryType(type)}
                  className={cn(
                    "focus-ring heading-font rounded-2xl border px-3 py-3 text-sm font-bold transition",
                    entryType === type
                      ? entryTypeConfig[type].activeClassName
                      : "border-[#eadfda] bg-white text-[#5d4b4c] hover:bg-[#fffaf4]",
                  )}
                >
                  <span aria-hidden="true">{entryTypeConfig[type].icon}</span>{" "}
                  {entryTypeConfig[type].label}
                </button>
              ),
            )}
          </div>

          <label className="sr-only" htmlFor="reader-journal-entry">
            {currentConfig.label} for page {currentPage}
          </label>
          <textarea
            id="reader-journal-entry"
            value={newEntryContent}
            onChange={(event) => setNewEntryContent(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentConfig.placeholder}
            className="focus-ring mb-3 h-28 w-full resize-none rounded-3xl border border-[#eadfda] bg-white px-4 py-3 text-base leading-7 text-[#241718] placeholder:text-[#9b898a] focus-visible:border-[#D6A13A]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-[#6f6061]">
              ⌘/Ctrl + Enter to save
            </p>
            <button
              onClick={handleSaveEntry}
              disabled={!newEntryContent.trim() || isSaving}
              className="focus-ring heading-font inline-flex min-h-12 items-center justify-center rounded-full bg-[#7E1518] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_36px_rgba(126,21,24,0.18)] transition hover:bg-[#681114] disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
            >
              {isSaving ? "Saving…" : `Save ${currentConfig.label}`}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm font-medium text-[#B94A4E]">{error}</p>
          )}
        </section>

        <section
          className="overflow-y-auto bg-white px-6 py-5"
          style={{ maxHeight: "calc(100vh - 340px)" }}
          aria-label="Saved journal entries"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FBF2DF] border-t-[#7E1518]" />
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#D6A13A]/70 bg-[#FBF2DF]/60 p-6 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-white text-xl text-[#D6A13A]">
                ✨
              </div>
              <h3 className="heading-font text-lg font-bold text-[#7E1518]">
                No entries yet
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5d4b4c]">
                Capture a note, quote, or question while the page is fresh.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {entriesForCurrentPage.length > 0 && (
                <EntryGroup
                  title="This page"
                  entries={entriesForCurrentPage}
                  onDelete={handleDeleteEntry}
                  onPageJump={onPageJump}
                  isCurrent
                />
              )}

              {otherEntries.length > 0 && (
                <EntryGroup
                  title="Other pages"
                  entries={otherEntries}
                  onDelete={handleDeleteEntry}
                  onPageJump={onPageJump}
                />
              )}
            </div>
          )}
        </section>
      </aside>
    </>
  );
}

function EntryGroup({
  title,
  entries,
  onDelete,
  onPageJump,
  isCurrent = false,
}: {
  title: string;
  entries: JournalEntry[];
  onDelete: (id: string) => void;
  onPageJump?: (page: number) => void;
  isCurrent?: boolean;
}) {
  return (
    <div>
      <h3 className="heading-font mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#7E1518]">
        {title}
      </h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <EntryItem
            key={entry.id}
            entry={entry}
            onDelete={onDelete}
            onPageJump={onPageJump}
            isCurrent={isCurrent}
          />
        ))}
      </div>
    </div>
  );
}

function EntryItem({
  entry,
  onDelete,
  onPageJump,
  isCurrent = false,
}: {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  onPageJump?: (page: number) => void;
  isCurrent?: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const config =
    entryTypeConfig[entry.entry_type as CapturableEntryType] ??
    entryTypeConfig.note;

  const time = new Date(entry.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <article
      className={cn(
        "rounded-3xl border p-4 shadow-[0_12px_30px_rgba(36,23,24,0.04)]",
        isCurrent ? "border-[#D6A13A]/45 bg-[#fffaf4]" : config.cardClassName,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "heading-font inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
              config.badgeClassName,
            )}
          >
            <span aria-hidden="true">{config.icon}</span> {config.label}
          </span>
          {entry.page_number && (
            <button
              onClick={() => onPageJump?.(entry.page_number!)}
              className="focus-ring heading-font inline-flex items-center gap-1 rounded-full bg-[#FBF2DF] px-3 py-1 text-xs font-bold text-[#7a5311] transition hover:bg-[#f4e3bc]"
              type="button"
            >
              📍 Page {entry.page_number}
            </button>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-[#6f6061]">
          {time}
        </span>
      </div>

      <p
        className={cn(
          "mb-3 whitespace-pre-wrap text-sm leading-6 text-[#241718]",
          entry.entry_type === "quote" &&
            "quote-font text-lg leading-8 text-[#1F2A44]",
        )}
      >
        {entry.entry_type === "quote" ? `“${entry.content}”` : entry.content}
      </p>

      <div className="flex justify-end">
        {showConfirm ? (
          <div className="flex items-center gap-2 rounded-2xl bg-[#F8EAEB] p-2">
            <span className="text-xs font-medium text-[#B94A4E]">Delete?</span>
            <button
              onClick={() => onDelete(entry.id)}
              className="focus-ring rounded-full bg-[#B94A4E] px-3 py-1 text-xs font-bold text-white"
              type="button"
            >
              Yes
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="focus-ring rounded-full bg-white px-3 py-1 text-xs font-bold text-[#5d4b4c] ring-1 ring-[#eadfda]"
              type="button"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="focus-ring rounded-full px-2 py-1 text-sm text-[#6f6061] transition hover:bg-[#F8EAEB] hover:text-[#B94A4E]"
            aria-label={`Delete ${config.label.toLowerCase()}`}
            type="button"
          >
            🗑️
          </button>
        )}
      </div>
    </article>
  );
}
