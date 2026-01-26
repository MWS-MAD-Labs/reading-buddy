import {
  LibraryCollection,
  type LibraryBook,
} from "@/components/dashboard/LibraryCollection";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await getCurrentUser();
  const isStudent = user.role === "STUDENT";
  const userAccessLevel = user.accessLevel;

  // Build query based on user role
  // Students only see books matching their access level
  // Staff see all books
  let result;

  if (isStudent && userAccessLevel) {
    // For students with access level, filter by their level
    result = await queryWithContext(
      user.userId!,
      `SELECT DISTINCT
        b.id, b.title, b.author, b.cover_url, b.description,
        b.genre, b.language, b.publisher, b.publication_year, b.created_at,
        COALESCE(AVG(br.rating) FILTER (WHERE br.status = 'APPROVED'), 0) as average_rating,
        COUNT(br.id) FILTER (WHERE br.status = 'APPROVED') as review_count
      FROM books b
      INNER JOIN book_access ba ON b.id = ba.book_id
      LEFT JOIN book_reviews br ON br.book_id = b.id
      WHERE ba.access_level = $1
      GROUP BY b.id
      ORDER BY b.created_at DESC`,
      [userAccessLevel],
    );
  } else {
    // For staff or students without access level set, show all published books
    // (i.e., books that have at least one access level - not draft books)
    result = await queryWithContext(
      user.userId!,
      `SELECT DISTINCT
        b.id, b.title, b.author, b.cover_url, b.description,
        b.genre, b.language, b.publisher, b.publication_year, b.created_at,
        COALESCE(AVG(br.rating) FILTER (WHERE br.status = 'APPROVED'), 0) as average_rating,
        COUNT(br.id) FILTER (WHERE br.status = 'APPROVED') as review_count
      FROM books b
      INNER JOIN book_access ba ON b.id = ba.book_id
      LEFT JOIN book_reviews br ON br.book_id = b.id
      GROUP BY b.id
      ORDER BY b.created_at DESC`,
      [],
    );
  }

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
    averageRating: book.average_rating ? parseFloat(book.average_rating) : null,
    reviewCount: parseInt(book.review_count) || 0,
  }));

  // Format access level for display
  const accessLevelDisplay = userAccessLevel
    ? userAccessLevel.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;

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
          {isStudent && accessLevelDisplay
            ? `Showing books for ${accessLevelDisplay} level`
            : "Explore all the amazing books in Reading Buddy!"}
        </p>
      </header>

      <LibraryCollection books={libraryBooks} />
    </div>
  );
}

