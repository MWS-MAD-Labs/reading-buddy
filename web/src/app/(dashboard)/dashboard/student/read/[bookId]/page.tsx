import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { BookReader } from "@/components/dashboard/BookReader";
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

  // Get book details
  const bookResult = await queryWithContext(
    user.userId,
    `SELECT * FROM books WHERE id = $1`,
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
      <BookReader
        bookId={book.id}
        pdfUrl={book.pdf_url}
        initialPage={initialPage}
        expectedPages={book.page_count}
        pageImages={pageImages}
        bookTitle={book.title}
      />
    </div>
  );
}
