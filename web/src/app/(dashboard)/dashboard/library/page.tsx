import {
  LibraryCollection,
  type LibraryBook,
} from "@/components/dashboard/LibraryCollection";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await getCurrentUser();

  const result = await queryWithContext(
    user.userId!,
    `SELECT
      id, title, author, cover_url, description,
      genre, language, publisher, publication_year, created_at
    FROM books
    ORDER BY created_at DESC`,
    [],
  );

  const libraryBooks: LibraryBook[] = result.rows.map((book: any) => ({
    id: book.id,
    title: book.title ?? "Untitled book",
    author: book.author ?? "Unknown author",
    coverUrl: book.cover_url,
    description: book.description ?? null,
    genre: book.genre ?? null,
    language: book.language ?? null,
    publisher: book.publisher ?? null,
    publicationYear: book.publication_year ?? null,
    createdAt: book.created_at ?? null,
  }));

  return (
    <div className="space-y-6">
      <header className="pop-in rounded-3xl border-4 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-lg">
        <div className="mb-2 inline-block rounded-2xl border-4 border-cyan-300 bg-cyan-400 px-4 py-1">
          <p className="text-sm font-black uppercase tracking-wide text-cyan-900">
            Book Collection
          </p>
        </div>
        <h1 className="text-3xl font-black text-blue-900">Library</h1>
        <p className="text-base font-semibold text-blue-700">
          Explore all the amazing books in Reading Buddy!
        </p>
      </header>

      <LibraryCollection books={libraryBooks} />
    </div>
  );
}
