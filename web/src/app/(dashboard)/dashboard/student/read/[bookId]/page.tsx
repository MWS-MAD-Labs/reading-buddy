import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { ReaderWithRatingPrompt } from "@/components/dashboard/ReaderWithRatingPrompt";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildPublicPrefixUrl } from "@/lib/minioUtils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ bookId: string }>;
  searchParams?: Promise<{ page?: string }>;
};

export default async function StudentReadPage({
  params,
  searchParams,
}: PageProps) {
  const awaitedParams = await params;
  const awaitedSearchParams = searchParams ? await searchParams : undefined;

  const user = await getCurrentUser();
  if (!user || !user.userId || !user.profileId) {
    redirect("/login");
  }

  const bookId = Number(awaitedParams.bookId);
  if (Number.isNaN(bookId)) {
    notFound();
  }

  // Get book details needed for the reader
  const bookResult = await queryWithContext(
    user.userId,
    `SELECT
      id, title, author, pdf_url, page_count,
      page_images_prefix, page_images_count,
      file_format, original_file_url, is_picture_book
     FROM books WHERE id = $1`,
    [bookId],
  );

  const book = bookResult.rows[0];
  if (!book) {
    notFound();
  }

  const pageImages =
    book.page_images_prefix && book.page_images_count
      ? {
          baseUrl: buildPublicPrefixUrl(book.page_images_prefix),
          count: book.page_images_count,
        }
      : null;

  // Determine EPUB URL for native rendering (for epub files that haven't been converted)
  // Normalize the URL to use current MinIO endpoint configuration
  const epubUrl =
    book.file_format === "epub" && book.original_file_url
      ? `/api/epub/${book.id}/file`
      : null;

  // Get student's reading progress
  const progressResult = await queryWithContext(
    user.userId,
    `SELECT current_page, epub_cfi FROM student_books
     WHERE student_id = $1 AND book_id = $2`,
    [user.profileId, bookId],
  );

  const progress = progressResult.rows[0];

  const requestedPage = awaitedSearchParams?.page
    ? Number.parseInt(awaitedSearchParams.page, 10) || undefined
    : undefined;

  const initialPage = requestedPage ?? progress?.current_page ?? 1;
  const initialCfi = requestedPage ? null : (progress?.epub_cfi ?? null);

  return (
    <div className="space-y-6">
      <Card variant="glow" padding="snug">
        <CardHeader className="mb-0">
          <Badge variant="sky" size="sm" className="w-fit">
            Now reading
          </Badge>
          <CardTitle className="mt-3 text-3xl text-[#7E1518] md:text-4xl">
            {book.title}
          </CardTitle>
          <CardDescription className="font-semibold">
            by {book.author}
          </CardDescription>
        </CardHeader>
      </Card>
      <ReaderWithRatingPrompt
        bookId={book.id}
        bookTitle={book.title}
        pdfUrl={book.pdf_url}
        epubUrl={epubUrl}
        initialPage={initialPage}
        initialCfi={initialCfi}
        pageImages={pageImages}
        fileFormat={book.file_format || "pdf"}
        totalPages={book.page_count}
      />
    </div>
  );
}
