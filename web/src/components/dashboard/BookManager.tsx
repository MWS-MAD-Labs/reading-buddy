"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  deleteBook,
  renderBookImages,
  extractBookText,
} from "@/app/(dashboard)/dashboard/librarian/actions";
import {
  ACCESS_LEVEL_OPTIONS,
  type AccessLevelValue,
} from "@/constants/accessLevels";
import { BookQuizManagement } from "./BookQuizManagement";

export type ManagedBookRecord = {
  id: number;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  genre: string;
  language: string;
  description: string | null;
  pageCount: number | null;
  pdfUrl: string;
  coverUrl: string;
  createdAt?: string | null;
  accessLevels: AccessLevelValue[];
  pageImagesCount?: number | null;
  pageImagesRenderedAt?: string | null;
  textExtractedAt?: string | null;
  textExtractionError?: string | null;
  textExtractionAttempts?: number;
  lastExtractionAttemptAt?: string | null;
};

const ACCESS_BADGES: Record<
  AccessLevelValue,
  { label: string; color: string }
> = {
  KINDERGARTEN: {
    label: "K",
    color:
      "bg-gradient-to-r from-emerald-400 to-teal-400 text-white border-emerald-300",
  },
  LOWER_ELEMENTARY: {
    label: "LE",
    color:
      "bg-gradient-to-r from-sky-400 to-blue-400 text-white border-sky-300",
  },
  UPPER_ELEMENTARY: {
    label: "UE",
    color:
      "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-300",
  },
  JUNIOR_HIGH: {
    label: "JH",
    color:
      "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-300",
  },
  TEACHERS_STAFF: {
    label: "TS",
    color:
      "bg-gradient-to-r from-amber-400 to-orange-400 text-white border-amber-300",
  },
};

const getContentStatusBadge = (book: ManagedBookRecord) => {
  if (book.textExtractedAt) {
    return (
      <span
        className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700"
        title="Text extracted successfully"
      >
        ✓ Extracted
      </span>
    );
  }

  if (book.textExtractionError) {
    return (
      <span
        className="cursor-help rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700"
        title={book.textExtractionError}
      >
        ✗ Failed
      </span>
    );
  }

  return (
    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
      ⚠ Pending
    </span>
  );
};

type BookManagerProps = {
  books: ManagedBookRecord[];
  genreOptions?: string[];
  languageOptions?: string[];
  onAddBookClick?: () => void;
  onEditBookClick?: (book: ManagedBookRecord) => void;
  isAddPanelOpen?: boolean;
};

export const BookManager = ({
  books,
  genreOptions = [],
  languageOptions = [],
  onAddBookClick,
  onEditBookClick,
  isAddPanelOpen = false,
}: BookManagerProps) => {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<number | null>(null);
  const [quizManagementBook, setQuizManagementBook] =
    useState<ManagedBookRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("ALL");
  const [languageFilter, setLanguageFilter] = useState<string>("ALL");
  const [authorFilter, setAuthorFilter] = useState<string>("ALL");
  const [publisherFilter, setPublisherFilter] = useState<string>("ALL");
  const [yearFilter, setYearFilter] = useState<string>("ALL");
  const [accessFilter, setAccessFilter] = useState<AccessLevelValue | "ALL">(
    "ALL",
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [renderingBookId, setRenderingBookId] = useState<number | null>(null);
  const [extractingBookId, setExtractingBookId] = useState<number | null>(null);

  const sortedBooks = useMemo(
    () =>
      [...books].sort((a, b) => {
        if (!a.createdAt || !b.createdAt) {
          return b.id - a.id;
        }
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }),
    [books],
  );

  const authorOptions = useMemo(
    () =>
      Array.from(
        new Set(
          books
            .map((book) => book.author)
            .filter((value) => Boolean(value && value.trim())),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [books],
  );
  const publisherOptions = useMemo(
    () =>
      Array.from(
        new Set(
          books
            .map((book) => book.publisher)
            .filter((value) => Boolean(value && value.trim())),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [books],
  );
  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          books
            .map((book) => book.publicationYear)
            .filter((value) => Number.isFinite(value)),
        ),
      ).sort((a, b) => b - a),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedBooks.filter((book) => {
      if (genreFilter !== "ALL" && book.genre !== genreFilter) {
        return false;
      }

      if (languageFilter !== "ALL" && book.language !== languageFilter) {
        return false;
      }

      if (authorFilter !== "ALL" && book.author !== authorFilter) {
        return false;
      }

      if (publisherFilter !== "ALL" && book.publisher !== publisherFilter) {
        return false;
      }

      if (yearFilter !== "ALL" && String(book.publicationYear) !== yearFilter) {
        return false;
      }

      if (accessFilter !== "ALL" && !book.accessLevels.includes(accessFilter)) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [book.title, book.author, book.isbn, book.publisher]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [
    sortedBooks,
    searchTerm,
    genreFilter,
    languageFilter,
    authorFilter,
    publisherFilter,
    yearFilter,
    accessFilter,
  ]);

  const handleEdit = (book: ManagedBookRecord) => {
    onEditBookClick?.(book);
  };

  const handleDelete = (book: ManagedBookRecord) => {
    if (!window.confirm(`Delete "${book.title}"? This cannot be undone.`)) {
      return;
    }
    setDeletePendingId(book.id);
    setFeedback(null);

    startDeleteTransition(async () => {
      try {
        await deleteBook({ id: book.id });
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to delete book.";
        setFeedback({ type: "error", message });
      } finally {
        setDeletePendingId(null);
      }
    });
  };

  const handleRender = async (book: ManagedBookRecord) => {
    setRenderingBookId(book.id);
    setFeedback(null);

    try {
      const result = await renderBookImages(book.id);
      if ("success" in result && result.success) {
        setFeedback({ type: "success", message: result.message });
        router.refresh();
      } else if ("error" in result) {
        setFeedback({
          type: "error",
          message: result.error || "Rendering failed",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to render book.";
      setFeedback({ type: "error", message });
    } finally {
      setRenderingBookId(null);
    }
  };

  const handleExtractText = async (book: ManagedBookRecord) => {
    setExtractingBookId(book.id);
    setFeedback(null);

    try {
      const result = await extractBookText(book.id);
      if (result.success) {
        setFeedback({
          type: "success",
          message: `${result.totalWords} words extracted from "${book.title}"`,
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.message });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to extract text.";
      setFeedback({ type: "error", message });
    } finally {
      setExtractingBookId(null);
    }
  };

  return (
    <section className="space-y-5 rounded-[32px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_25px_90px_rgba(119,65,255,0.18)] backdrop-blur-xl md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose-400">
            Librarian tools
          </p>
          <h2 className="text-2xl font-black tracking-tight text-indigo-950">
            Library Catalog
          </h2>
          <p className="text-sm text-indigo-500">
            Review, edit, or remove uploaded eBooks.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
          <button
            type="button"
            onClick={onAddBookClick}
            disabled={isAddPanelOpen}
            className="btn-3d btn-squish rounded-2xl border-4 border-pink-300 bg-gradient-to-r from-pink-400 to-fuchsia-500 px-6 py-3 text-lg font-black text-white shadow-lg transition hover:from-pink-500 hover:to-fuchsia-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAddPanelOpen ? "📚 Adding eBook…" : "➕ Add New eBook"}
          </button>
          {feedback ? (
            <span
              className={clsx(
                "rounded-2xl border-4 px-5 py-3 text-base font-black",
                feedback.type === "success"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                  : "border-rose-300 bg-rose-100 text-rose-700",
              )}
            >
              {feedback.type === "success" ? "✅ " : "⚠️ "}
              {feedback.message}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border-4 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 p-5 shadow-lg sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            🔍 Search
          </span>
          <input
            type="search"
            placeholder="Title, author, ISBN..."
            value={searchTerm}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(event.target.value)
            }
            className="rounded-2xl border-4 border-purple-300 bg-white px-4 py-2 font-semibold text-purple-900 outline-none transition-all"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            ✍️ Author
          </span>
          <select
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            className="rounded-2xl border-4 border-purple-300 bg-white px-4 py-2 font-semibold text-purple-900 outline-none transition-all"
          >
            <option value="ALL">All authors</option>
            {authorOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            🏢 Publisher
          </span>
          <select
            value={publisherFilter}
            onChange={(event) => setPublisherFilter(event.target.value)}
            className="rounded-2xl border-4 border-purple-300 bg-white px-4 py-2 font-semibold text-purple-900 outline-none transition-all"
          >
            <option value="ALL">All publishers</option>
            {publisherOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            📅 Year
          </span>
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            className="rounded-2xl border-4 border-purple-300 bg-white px-4 py-2 font-semibold text-purple-900 outline-none transition-all"
          >
            <option value="ALL">All years</option>
            {yearOptions.map((option) => (
              <option value={String(option)} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            🎭 Genre
          </span>
          <select
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value)}
            className="rounded-2xl border-4 border-purple-300 bg-white px-4 py-2 font-semibold text-purple-900 outline-none transition-all"
          >
            <option value="ALL">All genres</option>
            {genreOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            🌍 Language
          </span>
          <select
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value)}
            className="rounded-2xl border-4 border-purple-300 bg-white px-4 py-2 font-semibold text-purple-900 outline-none transition-all"
          >
            <option value="ALL">All languages</option>
            {languageOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            👥 Access
          </span>
          <select
            value={accessFilter}
            onChange={(event) =>
              setAccessFilter(event.target.value as AccessLevelValue | "ALL")
            }
            className="rounded-2xl border-4 border-purple-300 bg-white px-4 py-2 font-semibold text-purple-900 outline-none transition-all"
          >
            <option value="ALL">All access levels</option>
            {ACCESS_LEVEL_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredBooks.length === 0 ? (
        <div className="rounded-2xl border-4 border-yellow-300 bg-yellow-50 px-6 py-4 text-center">
          <p className="text-lg font-bold text-yellow-700">
            {books.length === 0
              ? '📚 No books yet! Click "Add New eBook" to get started!'
              : "🔍 No books match your filters. Try adjusting them!"}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-4 lg:hidden">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="rounded-3xl border-4 border-blue-300 bg-white p-5 shadow-lg transition-all hover:shadow-xl"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="mb-1 text-lg font-black text-purple-900">
                      {book.title}
                    </h3>
                    <p className="text-sm font-semibold text-purple-600">
                      ✍️ {book.author}
                    </p>
                  </div>
                </div>

                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="font-black text-blue-600">🔢 ISBN:</span>
                    <span className="text-purple-900">{book.isbn}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-black text-blue-600">
                      🏢 Publisher:
                    </span>
                    <span className="text-purple-900">{book.publisher}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-black text-blue-600">📅 Year:</span>
                    <span className="text-purple-900">
                      {book.publicationYear}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-black text-blue-600">🎭 Genre:</span>
                    <span className="text-purple-900">{book.genre}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-black text-blue-600">
                      🌍 Language:
                    </span>
                    <span className="text-purple-900">{book.language}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-black text-blue-600">
                      📄 Content:
                    </span>
                    {getContentStatusBadge(book)}
                  </div>
                </div>

                {book.accessLevels.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-sm font-black text-blue-600">
                      👥 Access Levels:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {book.accessLevels.map((level) => {
                        const badge = ACCESS_BADGES[level];
                        return (
                          <span
                            key={`${book.id}-${level}`}
                            className={clsx(
                              "rounded-2xl border-2 px-3 py-1 text-xs font-black uppercase tracking-wide shadow-sm",
                              badge?.color ??
                                "bg-indigo-100 text-indigo-600 border-indigo-300",
                            )}
                          >
                            {badge?.label ?? level.slice(0, 2)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuizManagementBook(book)}
                    className="min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-purple-300 bg-purple-100 px-4 py-2 text-sm font-black text-purple-600 transition hover:bg-purple-200 active:scale-95"
                  >
                    📝 Quizzes
                  </button>
                  {!book.pageImagesCount && (
                    <button
                      type="button"
                      onClick={() => handleRender(book)}
                      disabled={renderingBookId === book.id}
                      className="min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-black text-emerald-600 transition hover:bg-emerald-200 active:scale-95 disabled:opacity-40"
                    >
                      {renderingBookId === book.id
                        ? "⏳ Rendering"
                        : "🎨 Render"}
                    </button>
                  )}
                  {!book.textExtractedAt && (
                    <button
                      type="button"
                      onClick={() => handleExtractText(book)}
                      disabled={extractingBookId === book.id}
                      className="min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-amber-300 bg-amber-100 px-4 py-2 text-sm font-black text-amber-700 transition hover:bg-amber-200 active:scale-95 disabled:opacity-40"
                    >
                      {extractingBookId === book.id
                        ? "⏳ Extracting"
                        : "📝 Extract Text"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEdit(book)}
                    className="min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-indigo-300 bg-indigo-100 px-4 py-2 text-sm font-black text-indigo-600 transition hover:bg-indigo-200 active:scale-95"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(book)}
                    disabled={isDeleting && deletePendingId === book.id}
                    className="min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-rose-300 bg-rose-100 px-4 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-200 active:scale-95 disabled:opacity-40"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto rounded-3xl border-4 border-blue-300 bg-white shadow-xl lg:block">
            <table className="min-w-full divide-y-4 divide-blue-200 text-sm text-purple-900">
              <thead className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
                <tr>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    📖 Title
                  </th>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    🔢 ISBN
                  </th>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    ✍️ Author
                  </th>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    🏢 Publisher
                  </th>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    📅 Year
                  </th>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    🎭 Genre
                  </th>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    🌍 Language
                  </th>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    📄 Content
                  </th>
                  <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                    👥 Access
                  </th>
                  <th className="px-4 py-3 text-right text-base font-black text-blue-600">
                    ⚡ Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr
                    key={book.id}
                    className="border-b-2 border-blue-100 bg-transparent hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-purple-900">
                        {book.title}
                      </div>
                      <div className="text-xs font-semibold text-purple-600">
                        {book.author}
                      </div>
                    </td>
                    <td className="px-4 py-3">{book.isbn}</td>
                    <td className="px-4 py-3">{book.author}</td>
                    <td className="px-4 py-3">{book.publisher}</td>
                    <td className="px-4 py-3">{book.publicationYear}</td>
                    <td className="px-4 py-3">{book.genre}</td>
                    <td className="px-4 py-3">{book.language}</td>
                    <td className="px-4 py-3">{getContentStatusBadge(book)}</td>
                    <td className="px-4 py-3 text-xs">
                      {book.accessLevels.length ? (
                        <div className="flex flex-wrap gap-2">
                          {book.accessLevels.map((level) => {
                            const badge = ACCESS_BADGES[level];
                            return (
                              <span
                                key={`${book.id}-${level}`}
                                className={clsx(
                                  "rounded-2xl border-2 px-3 py-1 text-xs font-black uppercase tracking-wide shadow-sm",
                                  badge?.color ??
                                    "bg-indigo-100 text-indigo-600 border-indigo-300",
                                )}
                              >
                                {badge?.label ?? level.slice(0, 2)}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-purple-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setQuizManagementBook(book)}
                          className="min-h-[44px] min-w-[44px] rounded-full border border-purple-200 bg-white/80 p-2 text-purple-600 shadow-sm transition hover:bg-purple-50"
                          aria-label="Manage quizzes"
                          title="Manage quizzes"
                        >
                          📝
                        </button>
                        {!book.pageImagesCount && (
                          <button
                            type="button"
                            onClick={() => handleRender(book)}
                            disabled={renderingBookId === book.id}
                            className="min-h-[44px] min-w-[44px] rounded-full border border-emerald-200 bg-white/80 p-2 text-emerald-600 shadow-sm transition hover:bg-emerald-50 disabled:opacity-40"
                            aria-label="Render book images"
                            title="Render book images"
                          >
                            {renderingBookId === book.id ? "⏳" : "🎨"}
                          </button>
                        )}
                        {!book.textExtractedAt && (
                          <button
                            type="button"
                            onClick={() => handleExtractText(book)}
                            disabled={extractingBookId === book.id}
                            className="min-h-[44px] min-w-[44px] rounded-full border border-amber-200 bg-white/80 p-2 text-amber-600 shadow-sm transition hover:bg-amber-50 disabled:opacity-40"
                            aria-label="Extract text from book"
                            title="Extract text from book"
                          >
                            {extractingBookId === book.id ? "⏳" : "📝"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEdit(book)}
                          className="min-h-[44px] min-w-[44px] rounded-full border border-indigo-200 bg-white/80 p-2 text-indigo-600 shadow-sm transition hover:bg-indigo-50"
                          aria-label="Edit book"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(book)}
                          disabled={isDeleting && deletePendingId === book.id}
                          className="min-h-[44px] min-w-[44px] rounded-full border border-rose-200 bg-white/80 p-2 text-rose-500 shadow-sm transition hover:bg-rose-50 disabled:opacity-40"
                          aria-label="Delete book"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Quiz Management Modal */}
      {quizManagementBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border-4 border-indigo-300 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-indigo-900">
                  📝 Quiz Management
                </h3>
                <p className="text-lg font-semibold text-indigo-600">
                  {quizManagementBook.title}
                </p>
              </div>
              <button
                onClick={() => setQuizManagementBook(null)}
                className="rounded-full border-2 border-gray-300 bg-white px-4 py-2 text-2xl font-bold text-gray-600 transition hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <BookQuizManagement
              bookId={quizManagementBook.id}
              bookTitle={quizManagementBook.title}
              bookPageCount={quizManagementBook.pageCount}
              hasExtractedText={!!quizManagementBook.textExtractedAt}
            />
          </div>
        </div>
      )}
    </section>
  );
};
