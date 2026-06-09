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
  normalizeAccessLevels,
} from "@/constants/accessLevels";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  fileFormat?: string;
  isPictureBook?: boolean;
};

const ACCESS_BADGES: Record<
  AccessLevelValue,
  { label: string; color: string }
> = {
  KINDERGARTEN: {
    label: "K",
    color: "border-[#6F8B6A]/35 bg-[#EDF3EB] text-[#486142]",
  },
  LOWER_ELEMENTARY: {
    label: "LE",
    color: "border-[#B8DDF8]/70 bg-[#EFF8FE] text-[#25638e]",
  },
  UPPER_ELEMENTARY: {
    label: "UE",
    color: "border-[#7E1518]/20 bg-[#F5E7E8] text-[#7E1518]",
  },
  JUNIOR_HIGH: {
    label: "JH",
    color: "border-[#D6A13A]/45 bg-[#FBF2DF] text-[#7a5311]",
  },
  TEACHERS_STAFF: {
    label: "TS",
    color: "border-[#eadfda] bg-white text-[#241718]",
  },
};

const getContentStatusBadge = (book: ManagedBookRecord) => {
  // EPUBs work natively
  if (book.fileFormat === "epub") {
    return (
      <Badge
        variant="lime"
        size="sm"
        title="EPUB files work natively"
        className="rounded-full"
      >
        EPUB ready
      </Badge>
    );
  }

  // PDFs with rendered images are ready
  if (book.pageImagesCount && book.pageImagesCount > 0) {
    return (
      <Badge
        variant="sky"
        size="sm"
        title={`Ready to read (${book.pageImagesCount} pages rendered)`}
        className="rounded-full"
      >
        Reader ready
      </Badge>
    );
  }

  // PDFs are only ready once rendered images exist
  if (book.fileFormat === "pdf") {
    return (
      <Badge
        variant="amber"
        size="sm"
        title="PDF uploads are processed automatically after upload."
        className="rounded-full"
      >
        Processing
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" size="sm" className="rounded-full">
      Pending
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
    type: "success" | "error" | "info";
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

      const bookAccessLevels = normalizeAccessLevels(book.accessLevels);
      if (accessFilter !== "ALL" && !bookAccessLevels.includes(accessFilter)) {
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
        className="space-y-6 border-4 border-white/70"
      >
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="bubble" size="sm">
              Catalog tools
            </Badge>
            <CardTitle className="text-2xl tracking-tight">
              Library Catalog
            </CardTitle>
            <CardDescription>
              Review, edit, quiz, or remove uploaded eBooks.
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={onAddBookClick}
            disabled={isAddPanelOpen}
            variant="primary"
            size="md"
          >
            {isAddPanelOpen ? "Adding eBook…" : "Add new eBook"}
          </Button>
        </CardHeader>

        {feedback ? (
          <Alert variant={feedback.type} className="w-full">
            {feedback.message}
          </Alert>
        ) : null}

        <CardContent className="space-y-5">
          <Card
            variant="playful"
            padding="snug"
            className="border border-[#eadfda]"
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
                  <Card
                    key={book.id}
                    variant="frosted"
                    padding="snug"
                    className="transition hover:border-[#D6A13A]/60"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="heading-font mb-1 text-lg font-bold text-[#241718]">
                          {book.title}
                        </h3>
                        <p className="text-sm font-medium text-[#5d4b4c]">
                          {book.author}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-bold text-[#7E1518]">ISBN:</span>
                        <span className="text-[#241718]">{book.isbn}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-[#7E1518]">
                          Publisher:
                        </span>
                        <span className="text-[#241718]">{book.publisher}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-[#7E1518]">Year:</span>
                        <span className="text-[#241718]">
                          {book.publicationYear}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-[#7E1518]">Genre:</span>
                        <span className="text-[#241718]">{book.genre}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-[#7E1518]">
                          Language:
                        </span>
                        <span className="text-[#241718]">{book.language}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-[#7E1518]">
                          Content:
                        </span>
                        {getContentStatusBadge(book)}
                      </div>
                    </div>

                    {(() => {
                      const accessLevels = normalizeAccessLevels(
                        book.accessLevels,
                      );
                      if (!accessLevels.length) return null;

                      return (
                        <div className="mb-4">
                          <p className="mb-2 text-sm font-bold text-[#7E1518]">
                            Access Levels:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {accessLevels.map((level) => {
                              const badge =
                                ACCESS_BADGES[
                                  level as keyof typeof ACCESS_BADGES
                                ];
                              return (
                                <span
                                  key={`${book.id}-${level}`}
                                  className={clsx(
                                    "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
                                    badge?.color ??
                                      "border-[#eadfda] bg-white text-[#241718]",
                                  )}
                                >
                                  {badge?.label ?? level.slice(0, 2)}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid gap-2 sm:grid-cols-3">
                      <Button
                        type="button"
                        onClick={() => setQuizManagementBook(book)}
                        variant="neutral"
                        size="sm"
                        aria-label="Manage quizzes"
                      >
                        Quizzes
                      </Button>

                      <Button
                        type="button"
                        onClick={() => handleEdit(book)}
                        variant="outline"
                        size="sm"
                        aria-label="Edit book"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDelete(book)}
                        disabled={isDeleting && deletePendingId === book.id}
                        variant="danger"
                        size="sm"
                        aria-label="Delete book"
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto rounded-3xl border border-[#eadfda] bg-white lg:block">
                <table className="min-w-full divide-y divide-[#eadfda] text-sm text-[#241718]">
                  <thead className="bg-[#fffaf4]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        ISBN
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Author
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Publisher
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Year
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Genre
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Language
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Content
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Access
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#7E1518]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book: any) => (
                      <tr
                        key={book.id}
                        className="border-b border-[#eadfda] bg-transparent hover:bg-[#fffaf4]"
                      >
                        <td className="px-4 py-3">
                          <div className="heading-font font-bold text-[#241718]">
                            {book.title}
                          </div>
                          <div className="text-xs font-medium text-[#5d4b4c]">
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
                          {(() => {
                            const accessLevels = normalizeAccessLevels(
                              book.accessLevels,
                            );
                            if (!accessLevels.length) {
                              return <span className="text-[#9b898a]">—</span>;
                            }

                            return (
                              <div className="flex flex-wrap gap-2">
                                {accessLevels.map((level) => {
                                  const badge =
                                    ACCESS_BADGES[
                                      level as keyof typeof ACCESS_BADGES
                                    ];
                                  return (
                                    <span
                                      key={`${book.id}-${level}`}
                                      className={clsx(
                                        "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
                                        badge?.color ??
                                          "border-[#eadfda] bg-white text-[#241718]",
                                      )}
                                    >
                                      {badge?.label ?? level.slice(0, 2)}
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
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
                                  setActionMenu({
                                    id: book.id,
                                    anchor: e.currentTarget,
                                  });
                                }
                              }}
                              className="h-10 w-10 rounded-full border border-[#eadfda] bg-white text-lg font-bold text-[#7E1518] shadow-sm transition hover:border-[#D6A13A]/60 hover:bg-[#fffaf4]"
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
              className="fixed z-50 w-44 rounded-2xl border border-[#eadfda] bg-white p-2 text-sm font-semibold text-[#241718] shadow-xl animate-in fade-in zoom-in-95 duration-100"
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
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-[#fffaf4]"
                >
                  <span>Quizzes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    handleEdit(book);
                  }}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-[#fffaf4]"
                >
                  <span>Edit</span>
                </button>

                <div className="mx-2 my-1 border-t border-[#eadfda]" />

                <button
                  type="button"
                  onClick={() => {
                    setActionMenu(null);
                    handleDelete(book);
                  }}
                  disabled={isDeleting && deletePendingId === book.id}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[#B94A4E] transition hover:bg-[#F8EAEB] disabled:opacity-50"
                >
                  <span>Delete</span>
                </button>
              </div>
            </div>,
            document.body,
          );
        })()}

      {/* Quiz Management Modal */}
      {quizManagementBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#241718]/45 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-4xl border border-white/80 bg-white p-6 shadow-[0_35px_120px_rgba(36,23,24,0.22)] md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Badge variant="bubble" size="sm">
                  Quiz management
                </Badge>
                <h3 className="heading-font text-2xl font-bold text-[#241718]">
                  {quizManagementBook.title}
                </h3>
              </div>
              <Button
                type="button"
                onClick={() => setQuizManagementBook(null)}
                variant="neutral"
                size="sm"
              >
                Close
              </Button>
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
