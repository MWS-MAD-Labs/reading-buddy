import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { BookManagementSection } from "@/components/dashboard/BookManagementSection";
import type { ManagedBookRecord } from "@/components/dashboard/BookManager";
import { LibrarianStatsCards } from "@/components/dashboard/librarian/LibrarianStatsCards";
import { getLibrarianStats } from "./stats-actions";
import type { AccessLevelValue } from "@/constants/accessLevels";
import { normalizeAccessLevels } from "@/constants/accessLevels";
import { requireRole } from "@/lib/auth/roleCheck";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const CURRENT_YEAR = new Date().getFullYear();

type LibrarianPageProps = {
  searchParams?: Promise<{ quizBookId?: string }>;
};

export default async function LibrarianPage({ searchParams }: LibrarianPageProps) {
  // Only ADMIN and LIBRARIAN users can access this page
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const user = await getCurrentUser();
  const awaitedSearchParams = searchParams ? await searchParams : undefined;
  const parsedQuizBookId = awaitedSearchParams?.quizBookId
    ? Number.parseInt(awaitedSearchParams.quizBookId, 10)
    : undefined;
  const quizBookId =
    parsedQuizBookId && Number.isInteger(parsedQuizBookId) && parsedQuizBookId > 0
      ? parsedQuizBookId
      : undefined;
  const statsResult = user.userId ? await getLibrarianStats(user.userId) : null;

  // Get all books with their access levels
  const booksResult = await queryWithContext(
    user.userId!,
    `SELECT
      b.id, b.isbn, b.title, b.author, b.publisher, b.publication_year,
      b.genre, b.language, b.description, b.page_count, b.pdf_url, b.cover_url,
      b.created_at, b.page_images_count, b.page_images_rendered_at,
      b.text_extracted_at, b.text_extraction_error, b.text_extraction_attempts,
      b.last_extraction_attempt_at, b.file_format, b.is_picture_book,
      COALESCE(
        ARRAY_AGG(DISTINCT ba.access_level::text)
        FILTER (WHERE ba.access_level IS NOT NULL),
        '{}'::text[]
      ) AS access_levels
    FROM books b
    LEFT JOIN book_access ba ON ba.book_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC`,
    [],
  );

  const managedBooks: ManagedBookRecord[] = booksResult.rows.map(
    (book: any) => ({
      id: book.id,
      isbn: book.isbn ?? "",
      title: book.title ?? "",
      author: book.author ?? "",
      publisher: book.publisher ?? "",
      publicationYear:
        book.publication_year ??
        (book.created_at
          ? new Date(book.created_at).getFullYear()
          : CURRENT_YEAR),
      genre: book.genre ?? "",
      language: book.language ?? "",
      description: book.description,
      pageCount: book.page_count ?? null,
      pdfUrl: book.pdf_url,
      coverUrl: book.cover_url,
      createdAt: book.created_at,
      accessLevels: normalizeAccessLevels(
        book.access_levels,
      ) as AccessLevelValue[],
      pageImagesCount: book.page_images_count ?? null,
      pageImagesRenderedAt: book.page_images_rendered_at ?? null,
      textExtractedAt: book.text_extracted_at ?? null,
      textExtractionError: book.text_extraction_error ?? null,
      textExtractionAttempts: book.text_extraction_attempts ?? 0,
      lastExtractionAttemptAt: book.last_extraction_attempt_at ?? null,
      fileFormat: book.file_format ?? "pdf",
      isPictureBook: book.is_picture_book ?? false,
    }),
  );

  const genreOptions = Array.from(
    new Set(
      managedBooks
        .map((book: any) => book.genre)
        .filter((value: any) => Boolean(value && value.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const languageOptions = Array.from(
    new Set(
      managedBooks
        .map((book: any) => book.language)
        .filter((value: any) => Boolean(value && value.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <Card
        variant="glow"
        padding="spacious"
        className="border-4 border-white/70"
      >
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge variant="bubble" size="sm">
              Librarian workspace
            </Badge>
            <CardTitle className="text-3xl md:text-4xl">
              Curate the school library
            </CardTitle>
            <CardDescription className="max-w-2xl">
              Manage catalog metadata, reader access, quiz assets, badges, and
              student review moderation from one refreshed workspace.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/badges"
              className={cn(
                buttonVariants({ variant: "secondary", size: "md" }),
                "no-underline",
              )}
            >
              Manage Book Badges
            </Link>
            <Link
              href="/dashboard/librarian/reviews"
              className={cn(
                buttonVariants({ variant: "neutral", size: "md" }),
                "no-underline",
              )}
            >
              Moderate Reviews
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#eadfda] bg-white/80 p-4">
            <p className="heading-font text-2xl font-bold text-[#7E1518]">
              {managedBooks.length}
            </p>
            <p className="text-sm font-medium text-[#5d4b4c]">
              Books in catalog
            </p>
          </div>
          <div className="rounded-2xl border border-[#eadfda] bg-white/80 p-4">
            <p className="heading-font text-2xl font-bold text-[#6F8B6A]">
              {genreOptions.length}
            </p>
            <p className="text-sm font-medium text-[#5d4b4c]">Active genres</p>
          </div>
          <div className="rounded-2xl border border-[#eadfda] bg-white/80 p-4">
            <p className="heading-font text-2xl font-bold text-[#D6A13A]">
              {languageOptions.length}
            </p>
            <p className="text-sm font-medium text-[#5d4b4c]">
              Languages represented
            </p>
          </div>
        </CardContent>
      </Card>

      {statsResult?.success && statsResult.data ? (
        <LibrarianStatsCards stats={statsResult.data} />
      ) : null}

      <BookManagementSection
        books={managedBooks}
        genreOptions={genreOptions}
        languageOptions={languageOptions}
        initialQuizBookId={quizBookId}
      />
    </div>
  );
}
