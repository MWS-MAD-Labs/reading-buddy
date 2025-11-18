import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BookManagementSection } from "@/components/dashboard/BookManagementSection";
import type { ManagedBookRecord } from "@/components/dashboard/BookManager";
import type { AccessLevelValue } from "@/constants/accessLevels";
import { requireRole } from "@/lib/auth/roleCheck";

export const dynamic = "force-dynamic";

const CURRENT_YEAR = new Date().getFullYear();

export default async function LibrarianPage() {
  // Only ADMIN and LIBRARIAN users can access this page
  await requireRole(["ADMIN", "LIBRARIAN"]);

  const supabase = await createSupabaseServerClient();
  const { data: bookRows } = await supabase
    .from("books")
    .select(
      "id, isbn, title, author, publisher, publication_year, genre, language, description, page_count, pdf_url, cover_url, created_at, page_images_count, page_images_rendered_at, text_extracted_at, book_access(access_level)",
    )
    .order("created_at", { ascending: false });

  const managedBooks: ManagedBookRecord[] =
    bookRows?.map((book) => ({
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
      accessLevels:
        book.book_access?.map(
          (entry: { access_level: AccessLevelValue }) =>
            entry.access_level as AccessLevelValue,
        ) ?? [],
      pageImagesCount: book.page_images_count ?? null,
      pageImagesRenderedAt: book.page_images_rendered_at ?? null,
      textExtractedAt: book.text_extracted_at ?? null,
    })) ?? [];

  const genreOptions = Array.from(
    new Set(
      managedBooks
        .map((book) => book.genre)
        .filter((value) => Boolean(value && value.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const languageOptions = Array.from(
    new Set(
      managedBooks
        .map((book) => book.language)
        .filter((value) => Boolean(value && value.trim())),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <BookManagementSection
        books={managedBooks}
        genreOptions={genreOptions}
        languageOptions={languageOptions}
      />
    </div>
  );
}
