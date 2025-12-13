import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const bookId = Number(awaitedParams.bookId);
  if (Number.isNaN(bookId)) {
    notFound();
  }

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();
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

  const { data: progress } = await supabase
    .from("student_books")
    .select("current_page")
    .eq("student_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

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
