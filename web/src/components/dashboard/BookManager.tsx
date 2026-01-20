"use client";

import {
  useMemo,
  useState,
  useTransition,
  useEffect,
  useRef,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { deleteBook } from "@/app/(dashboard)/dashboard/librarian/actions";
import {
  ACCESS_LEVEL_OPTIONS,
  type AccessLevelValue,
} from "@/constants/accessLevels";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";
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
      <Badge
        variant="lime"
        size="sm"
        title="Text extracted successfully"
        className="rounded-full"
      >
        ✓ Extracted
      </Badge>
    );
  }

  if (book.textExtractionError) {
    return (
      <Badge
        variant="amber"
        size="sm"
        title={book.textExtractionError}
        className="cursor-help rounded-full"
      >
        ✗ Failed
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" size="sm" className="rounded-full">
      ⚠ Pending
    </Badge>
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

  const [actionMenu, setActionMenu] = useState<{
    id: number;
    anchor: HTMLElement;
  } | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate menu position when actionMenu changes
  useEffect(() => {
    if (!actionMenu?.anchor) {
      setMenuPosition(null);
      return;
    }

    // Use requestAnimationFrame to ensure layout is complete
    const rafId = requestAnimationFrame(() => {
      const rect = actionMenu.anchor.getBoundingClientRect();
      const top = rect.bottom + 4;
      const left = rect.right - 176;

      // Ensure it doesn't go off-screen
      const finalTop = Math.min(top, window.innerHeight - 300);
      const finalLeft = Math.max(16, left);

      setMenuPosition({ top: finalTop, left: finalLeft });
    });

    return () => cancelAnimationFrame(rafId);
  }, [actionMenu]);

  // Click outside handler - use ref to avoid stale closure issues
  const actionMenuRef = useRef(actionMenu);
  actionMenuRef.current = actionMenu;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only handle if menu is open
      if (!actionMenuRef.current) return;

      const target = e.target as HTMLElement;

      // Ignore clicks on the menu itself
      if (menuRef.current?.contains(target)) return;

      // Ignore clicks on any action button (they handle their own state)
      if (target.closest("[data-action-button]")) return;

      setActionMenu(null);
    };

    // Use click event (not mousedown) to ensure button onClick fires first
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []); // Empty deps - handler uses ref for current state

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
            .map((book: any) => book.author)
            .filter((value: any) => Boolean(value && value.trim())),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [books],
  );
  const publisherOptions = useMemo(
    () =>
      Array.from(
        new Set(
          books
            .map((book: any) => book.publisher)
            .filter((value: any) => Boolean(value && value.trim())),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [books],
  );
  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          books
            .map((book: any) => book.publicationYear)
            .filter((value: any) => Number.isFinite(value)),
        ),
      ).sort((a, b) => b - a),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return sortedBooks.filter((book: any) => {
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



  return (
    <section className="space-y-5">
      <Card
        variant="frosted"
        padding="cozy"
        className="space-y-6 border-4 border-white/70 text-indigo-950 shadow-[0_25px_90px_rgba(119,65,255,0.18)] backdrop-blur-xl"
      >
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-rose-400">
              Librarian tools
            </p>
            <CardTitle className="text-2xl font-black tracking-tight text-indigo-950">
              Library Catalog
            </CardTitle>
            <p className="text-sm text-indigo-500">
              Review, edit, or remove uploaded eBooks.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
            <Button
              type="button"
              onClick={onAddBookClick}
              disabled={isAddPanelOpen}
              variant="primary"
              size="md"
            >
              {isAddPanelOpen ? "Adding eBook…" : "Add new eBook"}
            </Button>
          </div>
        </CardHeader>

        {feedback ? (
          <Alert
            variant={feedback.type === "success" ? "success" : "error"}
            className="w-full"
          >
            {feedback.type === "success" ? "✅ " : "⚠️ "}
            {feedback.message}
          </Alert>
        ) : null}

        <CardContent className="space-y-5">
          <Card
            variant="playful"
            padding="snug"
            className="border-4 border-white/80 shadow-[0_16px_60px_rgba(124,58,237,0.14)]"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  type="search"
                  placeholder="Title, author, ISBN..."
                  value={searchTerm}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSearchTerm(event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Select
                  id="author"
                  value={authorFilter}
                  onChange={(event) => setAuthorFilter(event.target.value)}
                >
                  <option value="ALL">All authors</option>
                  {authorOptions.map((option: any) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher">Publisher</Label>
                <Select
                  id="publisher"
                  value={publisherFilter}
                  onChange={(event) => setPublisherFilter(event.target.value)}
                >
                  <option value="ALL">All publishers</option>
                  {publisherOptions.map((option: any) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select
                  id="year"
                  value={yearFilter}
                  onChange={(event) => setYearFilter(event.target.value)}
                >
                  <option value="ALL">All years</option>
                  {yearOptions.map((option: any) => (
                    <option value={String(option)} key={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Select
                  id="genre"
                  value={genreFilter}
                  onChange={(event) => setGenreFilter(event.target.value)}
                >
                  <option value="ALL">All genres</option>
                  {genreOptions.map((option: any) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  id="language"
                  value={languageFilter}
                  onChange={(event) => setLanguageFilter(event.target.value)}
                >
                  <option value="ALL">All languages</option>
                  {languageOptions.map((option: any) => (
                    <option value={option} key={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="access">Access</Label>
                <Select
                  id="access"
                  value={accessFilter}
                  onChange={(event) =>
                    setAccessFilter(
                      event.target.value as AccessLevelValue | "ALL",
                    )
                  }
                >
                  <option value="ALL">All access levels</option>
                  {ACCESS_LEVEL_OPTIONS.map((option: any) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {filteredBooks.length === 0 ? (
            <Alert variant="warning" className="text-center">
              {books.length === 0
                ? 'No books yet. Click "Add new eBook" to get started.'
                : "No books match your filters. Try adjusting them."}
            </Alert>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-4 lg:hidden">
                {filteredBooks.map((book: any) => (
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
                          {book.author}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-black text-blue-600">ISBN:</span>
                        <span className="text-purple-900">{book.isbn}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-black text-blue-600">
                          Publisher:
                        </span>
                        <span className="text-purple-900">
                          {book.publisher}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-black text-blue-600">Year:</span>
                        <span className="text-purple-900">
                          {book.publicationYear}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-black text-blue-600">Genre:</span>
                        <span className="text-purple-900">{book.genre}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-black text-blue-600">
                          Language:
                        </span>
                        <span className="text-purple-900">{book.language}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-black text-blue-600">
                          Content:
                        </span>
                        {getContentStatusBadge(book)}
                      </div>
                    </div>

                    {book.accessLevels.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-black text-blue-600">
                          Access Levels:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {book.accessLevels.map((level: any) => {
                            const badge =
                              ACCESS_BADGES[
                              level as keyof typeof ACCESS_BADGES
                              ];
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
                        aria-label="Manage quizzes"
                      >
                        📝
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(book)}
                        className="min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-indigo-300 bg-indigo-100 px-4 py-2 text-sm font-black text-indigo-600 transition hover:bg-indigo-200 active:scale-95"
                        aria-label="Edit book"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(book)}
                        disabled={isDeleting && deletePendingId === book.id}
                        className="min-h-[44px] min-w-[44px] flex-1 rounded-2xl border-4 border-rose-300 bg-rose-100 px-4 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-200 active:scale-95 disabled:opacity-40"
                        aria-label="Delete book"
                      >
                        🗑️
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
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                        ISBN
                      </th>
                      <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                        Author
                      </th>
                      <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                        Publisher
                      </th>
                      <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                        Year
                      </th>
                      <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                        Genre
                      </th>
                      <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                        Language
                      </th>
                      <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                        Content
                      </th>
                      <th className="px-4 py-3 text-left text-base font-black text-blue-600">
                        Access
                      </th>
                      <th className="px-4 py-3 text-right text-base font-black text-blue-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book: any) => (
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
                        <td className="px-4 py-3">
                          {getContentStatusBadge(book)}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {book.accessLevels.length ? (
                            <div className="flex flex-wrap gap-2">
                              {book.accessLevels.map((level: any) => {
                                const badge =
                                  ACCESS_BADGES[
                                  level as keyof typeof ACCESS_BADGES
                                  ];
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
                        <td className="relative px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              data-action-button
                              onClick={(e) => {
                                e.stopPropagation();
                                // Toggle menu: close if same book, open if different/none
                                if (actionMenu?.id === book.id) {
                                  setActionMenu(null);
                                } else {
                                  setActionMenu({ id: book.id, anchor: e.currentTarget });
                                }
                              }}
                              className="h-10 w-10 rounded-full border border-indigo-200 bg-white/80 text-lg font-black text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                              aria-haspopup="true"
                              aria-expanded={actionMenu?.id === book.id}
                              aria-label="Open actions"
                            >
                              ⋯
                            </button>
                          </div>
                          {/* Inline dropdown removed in favor of Portal */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Menu Portal */}
      {actionMenu &&
        menuPosition &&
        (() => {
          const book = books.find((b) => b.id === actionMenu.id);
          if (!book) return null;

          return createPortal(
            <div
              ref={menuRef}
              className="fixed z-50 w-44 rounded-2xl border border-indigo-100 bg-white p-2 text-sm font-semibold text-indigo-800 shadow-xl animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
              }}
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    setQuizManagementBook(book);
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-indigo-50"
                >
                  <span aria-hidden>📝</span>
                  <span>Quizzes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    handleEdit(book);
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-indigo-50"
                >
                  <span aria-hidden>✏️</span>
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    handleDelete(book);
                  }}
                  disabled={isDeleting && deletePendingId === book.id}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <span aria-hidden>🗑️</span>
                  <span>Delete</span>
                </button>
              </div>
            </div>,
            document.body,
          );
        })()}

      {/* Quiz Management Modal */}
      {quizManagementBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border-4 border-indigo-300 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-indigo-900">
                  Quiz Management
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
      <style jsx>{`
        @keyframes actionPop {
          from {
            opacity: 0;
            transform: translateY(-50%) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }
      `}</style>
    </section>
  );
};
