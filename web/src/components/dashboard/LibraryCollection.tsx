"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { BookDetailsModal } from "./BookDetailsModal";

const filterLabelClass =
  "heading-font text-xs font-bold uppercase tracking-[0.18em] text-[#7E1518]";
const filterControlClass =
  "focus-ring min-h-[44px] rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-base font-medium text-[#241718] outline-none transition-all placeholder:text-[#9b898a] focus:border-[#D6A13A] md:py-2";

export type LibraryBook = {
  id: number;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string | null;
  genre: string | null;
  language: string | null;
  publisher: string | null;
  publicationYear: number | null;
  createdAt: string | null;
  averageRating?: number | null;
  reviewCount?: number;
};

type FilterValue = "ALL" | string;

const buildStringOptions = (values: Array<string | null>) =>
  Array.from(
    new Set(
      values
        .map((value: any) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length)),
    ),
  ).sort((a, b) => a.localeCompare(b));

const buildYearOptions = (values: Array<number | null>) =>
  Array.from(
    new Set(
      values.filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      ),
    ),
  ).sort((a, b) => b - a);

type LibraryCollectionProps = {
  books: LibraryBook[];
  canUpdateProgress?: boolean;
};

export const LibraryCollection = ({
  books,
  canUpdateProgress = false,
}: LibraryCollectionProps) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [authorFilter, setAuthorFilter] = useState<FilterValue>("ALL");
  const [publisherFilter, setPublisherFilter] = useState<FilterValue>("ALL");
  const [genreFilter, setGenreFilter] = useState<FilterValue>("ALL");
  const [languageFilter, setLanguageFilter] = useState<FilterValue>("ALL");
  const [yearFilter, setYearFilter] = useState<FilterValue>("ALL");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  const authorOptions = useMemo(
    () => buildStringOptions(books.map((book: any) => book.author)),
    [books],
  );
  const publisherOptions = useMemo(
    () => buildStringOptions(books.map((book: any) => book.publisher)),
    [books],
  );
  const genreOptions = useMemo(
    () => buildStringOptions(books.map((book: any) => book.genre)),
    [books],
  );
  const languageOptions = useMemo(
    () => buildStringOptions(books.map((book: any) => book.language)),
    [books],
  );
  const yearOptions = useMemo(
    () => buildYearOptions(books.map((book: any) => book.publicationYear)),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return books.filter((book: any) => {
      if (authorFilter !== "ALL" && book.author !== authorFilter) {
        return false;
      }

      if (publisherFilter !== "ALL" && book.publisher !== publisherFilter) {
        return false;
      }

      if (genreFilter !== "ALL" && book.genre !== genreFilter) {
        return false;
      }

      if (languageFilter !== "ALL" && book.language !== languageFilter) {
        return false;
      }

      if (
        yearFilter !== "ALL" &&
        String(book.publicationYear ?? "") !== yearFilter
      ) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [book.title, book.author, book.publisher]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [
    books,
    searchTerm,
    authorFilter,
    publisherFilter,
    genreFilter,
    languageFilter,
    yearFilter,
  ]);

  const handleReadBook = (bookId: number) => {
    setSelectedBookId(null);
    router.push(`/dashboard/student/read/${bookId}`);
  };

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="grid gap-4 rounded-[28px] border border-[#eadfda] bg-white/90 p-4 card-shadow md:grid-cols-2 md:p-5 lg:grid-cols-3">
        <label className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
          <span className={filterLabelClass}>Search</span>
          <input
            type="search"
            placeholder="Title, author, publisher..."
            value={searchTerm}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(event.target.value)
            }
            className={filterControlClass}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={filterLabelClass}>Author</span>
          <select
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            className={filterControlClass}
          >
            <option value="ALL">All authors</option>
            {authorOptions.map((option: any) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={filterLabelClass}>Publisher</span>
          <select
            value={publisherFilter}
            onChange={(event) => setPublisherFilter(event.target.value)}
            className={filterControlClass}
          >
            <option value="ALL">All publishers</option>
            {publisherOptions.map((option: any) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={filterLabelClass}>Genre</span>
          <select
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value)}
            className={filterControlClass}
          >
            <option value="ALL">All genres</option>
            {genreOptions.map((option: any) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={filterLabelClass}>Language</span>
          <select
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value)}
            className={filterControlClass}
          >
            <option value="ALL">All languages</option>
            {languageOptions.map((option: any) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={filterLabelClass}>Year</span>
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            className={filterControlClass}
          >
            <option value="ALL">All years</option>
            {yearOptions.map((option: any) => (
              <option value={String(option)} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredBooks.length ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book: any) => (
            <li key={book.id} className="flex justify-center">
              <button
                onClick={() => setSelectedBookId(book.id)}
                className="group block w-full max-w-xs text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A13A] focus-visible:ring-offset-2"
              >
                <div className="h-full rounded-[24px] border border-[#eadfda] bg-white p-3 card-shadow transition-all hover:border-[#D6A13A]/70 hover:-translate-y-0.5">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-[#fffaf4] shadow-inner">
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        className="object-contain p-3"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-medium text-[#9b898a]">
                        No cover
                      </div>
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    <h2 className="heading-font line-clamp-2 text-lg font-bold text-[#7E1518]">
                      {book.title}
                      {book.publicationYear ? (
                        <span className="ml-1 text-sm font-medium text-[#7a5311]">
                          ({book.publicationYear})
                        </span>
                      ) : null}
                    </h2>
                    <p className="text-sm font-medium text-[#5d4b4c]">
                      by {book.author}
                    </p>

                    {/* Rating badge */}
                    {book.averageRating && book.averageRating > 0 ? (
                      <div className="flex items-center gap-1 pt-1">
                        <Star className="h-4 w-4 fill-[#D6A13A] text-[#D6A13A]" />
                        <span className="heading-font text-sm font-bold text-[#7a5311]">
                          {book.averageRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({book.reviewCount})
                        </span>
                      </div>
                    ) : (
                      <p className="pt-1 text-xs text-gray-400">
                        No ratings yet
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#D6A13A]/70 bg-[#FBF2DF]/60 p-8 text-center card-shadow">
          <div className="mb-3 text-5xl">
            {books.length === 0 ? "📚" : "🔍"}
          </div>
          <p className="heading-font text-lg font-bold text-[#7a5311]">
            {books.length === 0
              ? "No books yet! Librarians can add the first book from the Librarian dashboard."
              : "No books match your filters. Try adjusting your search!"}
          </p>
        </div>
      )}

      {/* Book Details Modal */}
      {selectedBookId && (
        <BookDetailsModal
          bookId={selectedBookId}
          onClose={() => setSelectedBookId(null)}
          onReadBook={handleReadBook}
          canUpdateProgress={canUpdateProgress}
        />
      )}
    </section>
  );
};
