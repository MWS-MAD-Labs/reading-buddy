"use server";

import { queryWithContext } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/server";

export type LibrarianStats = {
  bookLibrary: {
    total: number;
    byFormat: {
      pdf: number;
      epub: number;
      mobi: number;
      azw: number;
      azw3: number;
    };
    mostCommonFormat: string;
  };
  activeReaders: {
    count: number;
    percentageChange: number;
  };
  uploadStatistics: {
    successRate: number;
    recentUploads: Array<{
      id: string;
      title: string;
      uploadedAt: string;
      status: "success" | "failed" | "processing";
      format: string;
    }>;
    totalStorage: number; // in MB
    uploadsLast30Days: number;
  };
  popularBooks: {
    mostRead: Array<{
      id: string;
      title: string;
      author: string;
      coverUrl: string | null;
      readCount: number;
    }>;
    mostQuizzed: Array<{
      id: string;
      title: string;
      author: string;
      coverUrl: string | null;
      quizCount: number;
    }>;
  };
};

export async function getLibrarianStats(userId: string): Promise<{
  success: boolean;
  data?: LibrarianStats;
  error?: string;
}> {
  try {
    // 1. Book Library Stats
    const booksResult = await queryWithContext(
      userId,
      `SELECT file_format, created_at FROM books`,
      [],
    );

    const books = booksResult.rows;
    const byFormat = {
      pdf: books.filter((b) => b.file_format === "pdf").length,
      epub: books.filter((b) => b.file_format === "epub").length,
      mobi: books.filter((b) => b.file_format === "mobi").length,
      azw: books.filter((b) => b.file_format === "azw").length,
      azw3: books.filter((b) => b.file_format === "azw3").length,
    };

    const formatEntries = Object.entries(byFormat);
    const mostCommonFormat =
      formatEntries.length > 0
        ? formatEntries
            .reduce((max, curr) => (curr[1] > max[1] ? curr : max))[0]
            .toUpperCase()
        : "N/A";

    const bookLibrary = {
      total: books.length,
      byFormat,
      mostCommonFormat,
    };

    // 2. Active Readers (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentReadersResult = await queryWithContext(
      userId,
      `SELECT COUNT(*) as count FROM profiles WHERE last_read_date >= $1`,
      [sevenDaysAgo.toISOString()],
    );

    const previousReadersResult = await queryWithContext(
      userId,
      `SELECT COUNT(*) as count FROM profiles
       WHERE last_read_date >= $1 AND last_read_date < $2`,
      [fourteenDaysAgo.toISOString(), sevenDaysAgo.toISOString()],
    );

    const currentCount = parseInt(recentReadersResult.rows[0]?.count || "0");
    const previousCount = parseInt(previousReadersResult.rows[0]?.count || "0");
    const percentageChange =
      previousCount > 0
        ? ((currentCount - previousCount) / previousCount) * 100
        : currentCount > 0
          ? 100
          : 0;

    const activeReaders = {
      count: currentCount,
      percentageChange: Math.round(percentageChange),
    };

    // 3. Upload Statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBooks = books.filter((b) => {
      const createdAt = new Date(b.created_at);
      return createdAt >= thirtyDaysAgo;
    });

    const uploadsLast30Days = recentBooks.length;

    // Get detailed recent uploads (last 10)
    const recentUploadsResult = await queryWithContext(
      userId,
      `SELECT id, title, created_at, file_format, text_extraction_error
       FROM books
       ORDER BY created_at DESC
       LIMIT 10`,
      [],
    );

    const recentUploads = recentUploadsResult.rows.map((book) => ({
      id: book.id.toString(),
      title: book.title,
      uploadedAt: book.created_at,
      status: book.text_extraction_error
        ? ("failed" as const)
        : ("success" as const),
      format: (book.file_format || "PDF").toUpperCase(),
    }));

    // Calculate success rate
    const failedUploads = recentBooks.filter((b) => {
      const book = books.find((book) => book.created_at === b.created_at);
      return book && book.text_extraction_error;
    }).length;
    const successRate =
      uploadsLast30Days > 0
        ? Math.round(
            ((uploadsLast30Days - failedUploads) / uploadsLast30Days) * 100,
          )
        : 100;

    // Estimate storage (rough calculation based on average file sizes)
    // PDF/EPUB: ~2MB, MOBI/AZW: ~1MB average
    const estimatedStorage = Math.round(
      (byFormat.pdf + byFormat.epub) * 2 +
        (byFormat.mobi + byFormat.azw + byFormat.azw3) * 1,
    );

    const uploadStatistics = {
      successRate,
      recentUploads,
      totalStorage: estimatedStorage,
      uploadsLast30Days,
    };

    // 4. Popular Books - Most Read (based on student_books entries)
    const mostReadResult = await queryWithContext(
      userId,
      `SELECT
        b.id,
        b.title,
        b.author,
        b.cover_url,
        COUNT(sb.id) as read_count
      FROM books b
      LEFT JOIN student_books sb ON sb.book_id = b.id
      GROUP BY b.id, b.title, b.author, b.cover_url
      ORDER BY read_count DESC
      LIMIT 5`,
      [],
    );

    const mostRead = mostReadResult.rows.map((book) => ({
      id: book.id.toString(),
      title: book.title,
      author: book.author ?? "Unknown author",
      coverUrl: book.cover_url ?? null,
      readCount: parseInt(book.read_count || "0"),
    }));

    // Most Quizzed (based on quizzes table)
    const mostQuizzedResult = await queryWithContext(
      userId,
      `SELECT
        b.id,
        b.title,
        b.author,
        b.cover_url,
        COUNT(q.id) as quiz_count
      FROM books b
      LEFT JOIN quizzes q ON q.book_id = b.id
      GROUP BY b.id, b.title, b.author, b.cover_url
      HAVING COUNT(q.id) > 0
      ORDER BY quiz_count DESC
      LIMIT 5`,
      [],
    );

    const mostQuizzed = mostQuizzedResult.rows.map((book) => ({
      id: book.id.toString(),
      title: book.title,
      author: book.author ?? "Unknown author",
      coverUrl: book.cover_url ?? null,
      quizCount: parseInt(book.quiz_count || "0"),
    }));

    const popularBooks = {
      mostRead,
      mostQuizzed,
    };

    const stats: LibrarianStats = {
      bookLibrary,
      activeReaders,
      uploadStatistics,
      popularBooks,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error in getLibrarianStats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
