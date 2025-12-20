"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Image from "next/image";
import Link from "next/link";

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
};

export const LibraryCollection = ({ books }: LibraryCollectionProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [authorFilter, setAuthorFilter] = useState<FilterValue>("ALL");
  const [publisherFilter, setPublisherFilter] = useState<FilterValue>("ALL");
  const [genreFilter, setGenreFilter] = useState<FilterValue>("ALL");
  const [languageFilter, setLanguageFilter] = useState<FilterValue>("ALL");
  const [yearFilter, setYearFilter] = useState<FilterValue>("ALL");

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

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="grid gap-4 rounded-2xl border-4 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 p-4 shadow-lg md:grid-cols-2 md:p-5 lg:grid-cols-3">
        <label className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            🔍 Search
          </span>
          <input
            type="search"
            placeholder="Title, author, publisher..."
            value={searchTerm}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(event.target.value)
            }
            className="min-h-[44px] rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 text-base font-semibold text-purple-900 outline-none transition-all md:py-2"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            ✍️ Author
          </span>
          <select
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            className="min-h-[44px] rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 text-base font-semibold text-purple-900 outline-none transition-all md:py-2"
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
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            🏢 Publisher
          </span>
          <select
            value={publisherFilter}
            onChange={(event) => setPublisherFilter(event.target.value)}
            className="min-h-[44px] rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 text-base font-semibold text-purple-900 outline-none transition-all md:py-2"
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
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            🎭 Genre
          </span>
          <select
            value={genreFilter}
            onChange={(event) => setGenreFilter(event.target.value)}
            className="min-h-[44px] rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 text-base font-semibold text-purple-900 outline-none transition-all md:py-2"
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
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            🌍 Language
          </span>
          <select
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value)}
            className="min-h-[44px] rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 text-base font-semibold text-purple-900 outline-none transition-all md:py-2"
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
          <span className="text-sm font-black uppercase tracking-wide text-purple-600">
            📅 Year
          </span>
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
            className="min-h-[44px] rounded-2xl border-4 border-purple-300 bg-white px-4 py-3 text-base font-semibold text-purple-900 outline-none transition-all md:py-2"
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
              <Link
                href={`/dashboard/student/read/${book.id}`}
                className="group block w-full max-w-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              >
                <div className="h-full [perspective:2000px]">
                  <div className="relative h-full min-h-[24rem] rounded-2xl border-2 border-purple-300 bg-white shadow-md transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                    <div className="absolute inset-0 flex h-full w-full flex-col gap-3 p-3 [backface-visibility:hidden]">
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-purple-50 shadow-inner transition-colors duration-300 group-hover:bg-white">
                        {book.coverUrl ? (
                          <Image
                            src={book.coverUrl}
                            alt={book.title}
                            fill
                            className="object-contain p-3 transition-opacity duration-300 group-hover:opacity-0"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm font-semibold text-purple-400">
                            No cover
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-lg font-black text-purple-900">
                          {book.title}
                          {book.publicationYear ? (
                            <span className="ml-1 text-sm font-semibold text-purple-500">
                              ({book.publicationYear})
                            </span>
                          ) : null}
                        </h2>
                        <p className="text-base font-bold text-purple-600">
                          by {book.author}
                        </p>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex h-full w-full flex-col rounded-2xl bg-gradient-to-b from-purple-600/90 via-purple-700/90 to-indigo-800/90 p-3 text-white [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <h3 className="text-lg font-black">
                        {book.title}
                        {book.publicationYear ? (
                          <span className="ml-1 text-sm font-semibold text-white/80">
                            ({book.publicationYear})
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-sm font-semibold text-white/80">
                        {book.author}
                      </p>
                      <div className="mt-3 flex-1 rounded-xl bg-white/10 p-3 text-sm leading-relaxed">
                        {book.description
                          ? book.description
                          : "No description yet. Flip back to see the cover!"}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-3xl border-4 border-dashed border-yellow-300 bg-yellow-50 p-8 text-center shadow-lg">
          <div className="mb-3 text-5xl">
            {books.length === 0 ? "📚" : "🔍"}
          </div>
          <p className="text-lg font-bold text-yellow-700">
            {books.length === 0
              ? "No books yet! Librarians can add the first book from the Librarian dashboard."
              : "No books match your filters. Try adjusting your search!"}
          </p>
        </div>
      )}
    </section>
  );
};
