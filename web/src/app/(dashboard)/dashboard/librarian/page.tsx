import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { BookManagementSection } from "@/components/dashboard/BookManagementSection";
import type { ManagedBookRecord } from "@/components/dashboard/BookManager";
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

export default async function LibrarianPage() {
  // Only ADMIN and LIBRARIAN users can access this page
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const user = await getCurrentUser();

  // Get all books with their access levels
  const booksResult = await queryWithContext(
    user.userId!,
    `SELECT
      b.id, b.isbn, b.title, b.author, b.publisher, b.publication_year,
      b.genre, b.language, b.description, b.page_count, b.pdf_url, b.cover_url,
      b.created_at, b.page_images_count, b.page_images_rendered_at,
      b.text_extracted_at, b.text_extraction_error, b.text_extraction_attempts,
      b.last_extraction_attempt_at, b.file_format,
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
      accessLevels: normalizeAccessLevels(book.access_levels) as AccessLevelValue[],
      pageImagesCount: book.page_images_count ?? null,
      pageImagesRenderedAt: book.page_images_rendered_at ?? null,
      textExtractedAt: book.text_extracted_at ?? null,
      textExtractionError: book.text_extraction_error ?? null,
      textExtractionAttempts: book.text_extraction_attempts ?? 0,
      lastExtractionAttemptAt: book.last_extraction_attempt_at ?? null,
      fileFormat: book.file_format ?? "pdf",
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
      {/* Quick Actions */}
      <Card variant="glow" padding="snug" className="border-4 border-white/70">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>
              Jump into the librarian tasks you need most.
            </CardDescription>
          </div>
          <Badge variant="neutral" className="text-[10px]">
            Librarian tools
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/admin/badges"
            className={cn(
              buttonVariants({ variant: "secondary", size: "md" }),
              "no-underline",
            )}
          >
            <span>Manage Book Badges</span>
          </Link>
          <Link
            href="/dashboard/librarian/reviews"
            className={cn(
              buttonVariants({ variant: "secondary", size: "md" }),
              "no-underline",
            )}
          >
            <span>📝 Moderate Reviews</span>
          </Link>
        </CardContent>
      </Card>

      <BookManagementSection
        books={managedBooks}
        genreOptions={genreOptions}
        languageOptions={languageOptions}
      />
    </div>
  );
}
