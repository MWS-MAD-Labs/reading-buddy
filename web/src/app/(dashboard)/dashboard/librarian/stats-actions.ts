"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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

export async function getLibrarianStats(): Promise<{
  success: boolean;
  data?: LibrarianStats;
  error?: string;
}> {
  try {
    const supabase = getSupabaseAdminClient();

    // 1. Book Library Stats
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("file_format, created_at");

    if (booksError) {
      console.error("Error fetching books:", booksError);
      return { success: false, error: "Failed to fetch book stats" };
    }

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
        ? formatEntries.reduce((max, curr) =>
            curr[1] > max[1] ? curr : max,
          )[0].toUpperCase()
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

    const { data: recentReaders } = await supabase
      .from("profiles")
      .select("id")
      .gte("last_read_date", sevenDaysAgo.toISOString());

    const { data: previousReaders } = await supabase
      .from("profiles")
      .select("id")
      .gte("last_read_date", fourteenDaysAgo.toISOString())
      .lt("last_read_date", sevenDaysAgo.toISOString());

    const currentCount = recentReaders?.length || 0;
    const previousCount = previousReaders?.length || 0;
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
    const { data: recentUploadsData, error: recentUploadsError } =
      await supabase
        .from("books")
        .select("id, title, created_at, file_format, text_extraction_error")
        .order("created_at", { ascending: false })
        .limit(10);

    if (recentUploadsError) {
      console.error("Error fetching recent uploads:", recentUploadsError);
    }

    const recentUploads =
      recentUploadsData?.map((book) => ({
        id: book.id,
        title: book.title,
        uploadedAt: book.created_at,
        status: book.text_extraction_error
          ? ("failed" as const)
          : ("success" as const),
        format: book.file_format.toUpperCase(),
      })) || [];

    // Calculate success rate
    const successfulUploads = recentBooks.filter(
      (b) => !books.find((book) => book.created_at === b.created_at),
    ).length;
    const successRate =
      uploadsLast30Days > 0
        ? Math.round((successfulUploads / uploadsLast30Days) * 100)
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

    // 4. Popular Books
    // Most Read (based on student_books entries)
    const { data: mostReadData, error: mostReadError } = await supabase
      .from("books")
      .select(
        "id, title, author, cover_url, student_books(count)",
      )
      .order("student_books.count", { ascending: false })
      .limit(5);

    if (mostReadError) {
      console.error("Error fetching most read books:", mostReadError);
    }

    // Most Quizzed (based on quizzes table)
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("book_id");

    if (quizError) {
      console.error("Error fetching quiz data:", quizError);
    }

    // Count quizzes per book
    const quizCounts: Record<string, number> = {};
    quizData?.forEach((quiz) => {
      quizCounts[quiz.book_id] = (quizCounts[quiz.book_id] || 0) + 1;
    });

    // Get top 5 most quizzed books
    const topQuizzedBookIds = Object.entries(quizCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([bookId]) => bookId);

    const { data: mostQuizzedData, error: mostQuizzedError } = await supabase
      .from("books")
      .select("id, title, author, cover_url")
      .in("id", topQuizzedBookIds);

    if (mostQuizzedError) {
      console.error("Error fetching most quizzed books:", mostQuizzedError);
    }

    const mostRead =
      mostReadData?.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        readCount: book.student_books?.length || 0,
      })) || [];

    const mostQuizzed =
      mostQuizzedData?.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        quizCount: quizCounts[book.id] || 0,
      })) || [];

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
