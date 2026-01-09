import Link from "next/link";
import { requireRole, type UserRole } from "@/lib/auth/roleCheck";
import { query } from "@/lib/db";
import {
  BadgeManager,
  type UserPermissions,
} from "@/components/dashboard/BadgeManager";

export const dynamic = "force-dynamic";

interface BadgeRow {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  xp_reward: number;
  badge_type: string;
  tier: string;
  category: string;
  criteria: Record<string, unknown>;
  book_id: number | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  book_title: string | null;
  book_author: string | null;
}

interface BookRow {
  id: number;
  title: string;
  author: string;
}

export default async function AdminBadgesPage() {
  // Authenticate and check role using NextAuth
  const { user, role } = await requireRole(["ADMIN", "LIBRARIAN"]);

  // Build permissions object based on role
  const isAdmin = role === "ADMIN";
  const isLibrarian = role === "LIBRARIAN";

  const permissions: UserPermissions = {
    role: role as "ADMIN" | "LIBRARIAN",
    userId: user.id,
    canCreateAllBadges: isAdmin,
    canEditSystemBadges: isAdmin,
    canOnlyCreateBookBadges: isLibrarian,
  };

  // Fetch all badges with book info using local PostgreSQL
  let badges: Array<BadgeRow & { book?: { id: number; title: string; author: string } | null }> = [];
  try {
    const badgesResult = await query<BadgeRow>(
      `SELECT b.*, 
              bk.title as book_title, 
              bk.author as book_author
       FROM badges b
       LEFT JOIN books bk ON b.book_id = bk.id
       ORDER BY b.display_order ASC`
    );

    // Transform to match the expected format with nested book object
    badges = badgesResult.rows.map((row) => ({
      ...row,
      book: row.book_id ? {
        id: row.book_id,
        title: row.book_title || "",
        author: row.book_author || "",
      } : null,
    }));
  } catch (error) {
    console.error("Failed to fetch badges:", error);
  }

  // Debug: Log badges count
  console.log(`[Badge Management] Fetched ${badges.length} badges`);

  // Fetch all books for the dropdown
  let books: BookRow[] = [];
  try {
    const booksResult = await query<BookRow>(
      `SELECT id, title, author FROM books ORDER BY title ASC`
    );
    books = booksResult.rows;
  } catch (error) {
    console.error("Failed to fetch books:", error);
  }

  // Header text based on role
  const headerDescription = isAdmin
    ? "Create and manage all badges for students. You can create general badges or book-specific completion badges."
    : "Create book-specific completion badges. Select a book to create a badge that students earn when they finish reading it.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-[32px] border border-white/60 bg-white/85 p-6 text-indigo-950 shadow-[0_25px_70px_rgba(147,118,255,0.25)]">
        <div className="flex items-center gap-2 text-sm text-indigo-400">
          <Link
            href={isAdmin ? "/dashboard/admin" : "/dashboard/librarian"}
            className="hover:text-indigo-600"
          >
            {isAdmin ? "Admin" : "Librarian"} Dashboard
          </Link>
          <span>/</span>
          <span className="text-indigo-600">Badge Management</span>
        </div>
        <h1 className="mt-2 text-3xl font-black">Badge Management</h1>
        <p className="text-sm text-indigo-500">{headerDescription}</p>
      </header>

      {/* Badge Manager Component */}
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_60px_rgba(147,118,255,0.18)]">
        <BadgeManager
          initialBadges={badges}
          books={books}
          permissions={permissions}
        />
      </div>
    </div>
  );
}
