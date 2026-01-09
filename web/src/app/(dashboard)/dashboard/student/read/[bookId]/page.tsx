import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { UnifiedBookReader } from "@/components/dashboard/UnifiedBookReader";
import { buildPublicPrefixUrl, normalizeMinioUrl } from "@/lib/minioUtils";

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

  // Get book details including new text-based reader columns
  const bookResult = await queryWithContext(
    user.userId,
    `SELECT 
      id, title, author, pdf_url, page_count,
      page_images_prefix, page_images_count,
      file_format, original_file_url, text_json_url, text_extraction_status
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
  const epubUrl = book.file_format === "epub" && book.original_file_url
    ? normalizeMinioUrl(book.original_file_url)
    : null;

  // Get student's reading progress
  const progressResult = await queryWithContext(
    user.userId,
    `SELECT current_page FROM student_books
     WHERE student_id = $1 AND book_id = $2`,
    [user.profileId, bookId],
  );

  const progress = progressResult.rows[0];

  const requestedPage = awaitedSearchParams?.page
    ? Number.parseInt(awaitedSearchParams.page, 10) || undefined
    : undefined;

  const initialPage = requestedPage ?? progress?.current_page ?? 1;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 p-3 shadow">
        <div className="mb-1 inline-block rounded-lg border-2 border-cyan-300 bg-cyan-400 px-3 py-0.5">
          <p className="text-xs font-black uppercase tracking-wide text-cyan-900">
            Now Reading
          </p>
        </div>
        <h1 className="text-2xl font-black text-blue-900">{book.title}</h1>
        <p className="text-sm font-bold text-blue-700">by {book.author}</p>
      </div>
      <UnifiedBookReader
        bookId={book.id}
        bookTitle={book.title}
        pdfUrl={book.pdf_url}
        epubUrl={epubUrl}
        initialPage={initialPage}
        pageImages={pageImages}
        textJsonUrl={book.text_json_url}
        textExtractionStatus={book.text_extraction_status}
        fileFormat={book.file_format || "pdf"}
      />
    </div>
  );
}
