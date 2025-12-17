"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getMinioBucketName, getMinioClient } from "@/lib/minio";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import {
  buildPublicObjectUrl,
  getObjectKeyFromPublicUrl,
} from "@/lib/minioUtils";
import type { AccessLevelValue } from "@/constants/accessLevels";
import type {
  QuizStatisticsWithBook,
  QuizQuestionsData,
} from "@/types/database";
import { checkRateLimit } from "@/lib/middleware/withRateLimit";
import { AIService } from "@/lib/ai";

export const checkCurrentUserRole = async () => {
  const user = await getCurrentUser();

  if (!user || !user.userId) {
    return { error: "Not signed in" };
  }

  try {
    // Query profiles to check for duplicates
    const result = await queryWithContext(
      user.userId,
      `SELECT role, full_name FROM profiles WHERE user_id = $1`,
      [user.userId],
    );

    const profiles = result.rows;
    const hasDuplicates = profiles && profiles.length > 1;
    const profile = profiles?.[0]; // Take the first one if multiple exist

    return {
      userId: user.userId,
      email: user.email,
      profile,
      profileError: null,
      hasDuplicates,
      profileCount: profiles?.length || 0,
    };
  } catch (error) {
    return {
      userId: user.userId,
      email: user.email,
      profile: null,
      profileError: error instanceof Error ? error.message : "Unknown error",
      hasDuplicates: false,
      profileCount: 0,
    };
  }
};

const ensureLibrarianOrAdmin = async () => {
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    throw new Error("You must be signed in to manage books.");
  }

  // Query profile to check role
  const result = await queryWithContext(
    user.userId,
    `SELECT role FROM profiles WHERE id = $1`,
    [user.profileId],
  );

  if (result.rows.length === 0) {
    throw new Error(
      "No profile found for your account. Please contact admin to set up your profile.",
    );
  }

  const profile = result.rows[0];

  if (!profile || !["LIBRARIAN", "ADMIN"].includes(profile.role)) {
    throw new Error(
      `Insufficient permissions. Your current role is: ${profile?.role || "unknown"}. Only LIBRARIAN or ADMIN users can manage books.`,
    );
  }

  return user;
};

const sanitizeFilename = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9_.-]/g, "_");

export const generatePresignedUploadUrls = async (input: {
  pdfFilename: string;
  coverFilename: string;
}) => {
  const minioClient = getMinioClient();
  const bucketName = getMinioBucketName();

  const sanitizedPdfFilename = sanitizeFilename(input.pdfFilename);
  const sanitizedCoverFilename = sanitizeFilename(input.coverFilename);

  const pdfObjectKey = `books/${randomUUID()}-${sanitizedPdfFilename}`;
  const coverObjectKey = `covers/${randomUUID()}-${sanitizedCoverFilename}`;

  const [pdfUploadUrl, coverUploadUrl] = await Promise.all([
    minioClient.presignedPutObject(bucketName, pdfObjectKey, 60 * 5),
    minioClient.presignedPutObject(bucketName, coverObjectKey, 60 * 5),
  ]);

  return {
    pdfUploadUrl,
    coverUploadUrl,
    pdfObjectKey,
    coverObjectKey,
    pdfPublicUrl: buildPublicObjectUrl(pdfObjectKey),
    coverPublicUrl: buildPublicObjectUrl(coverObjectKey),
  };
};

export const saveBookMetadata = async (input: {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear?: number;
  genre: string;
  language: string;
  description?: string;
  pageCount: number;
  accessLevels: AccessLevelValue[];
  pdfUrl: string;
  coverUrl: string;
  fileFormat?: "pdf" | "epub" | "mobi" | "azw" | "azw3";
  fileSizeBytes?: number;
}) => {
  const user = await ensureLibrarianOrAdmin();

  if (!input.accessLevels?.length) {
    throw new Error("At least one access level is required.");
  }

  try {
    // Insert book and return id
    const bookResult = await queryWithContext(
      user.userId,
      `INSERT INTO books (
        isbn, title, author, publisher, publication_year,
        genre, language, description, page_count, pdf_url, cover_url,
        file_format, original_file_url, file_size_bytes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        input.isbn,
        input.title,
        input.author,
        input.publisher,
        input.publicationYear ?? null,
        input.genre,
        input.language,
        input.description ?? null,
        input.pageCount,
        input.pdfUrl,
        input.coverUrl,
        input.fileFormat || "pdf",
        input.pdfUrl,
        input.fileSizeBytes ?? null,
      ],
    );

    if (bookResult.rows.length === 0) {
      throw new Error("Unable to insert book.");
    }

    const insertedBook = bookResult.rows[0];

    // Insert book access levels
    const accessValues = input.accessLevels
      .map((level, idx) => `($1, $${idx + 2})`)
      .join(", ");

    await queryWithContext(
      user.userId,
      `INSERT INTO book_access (book_id, access_level) VALUES ${accessValues}`,
      [insertedBook.id, ...input.accessLevels],
    );

    // Queue render job
    try {
      await queryWithContext(
        user.userId,
        `INSERT INTO book_render_jobs (book_id, status) VALUES ($1, $2)`,
        [insertedBook.id, "pending"],
      );
    } catch (jobError) {
      console.error("Unable to queue render job:", jobError);
    }

    revalidatePath("/dashboard/library");
    revalidatePath("/dashboard/librarian");

    return { bookId: insertedBook.id };
  } catch (error) {
    console.error("Book save error:", error);
    throw error;
  }
};

export const updateBookMetadata = async (input: {
  id: number;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  genre: string;
  language: string;
  description?: string | null;
  accessLevels: AccessLevelValue[];
  pdfUrl?: string;
  coverUrl?: string;
  pageCount?: number | null;
}) => {
  const user = await ensureLibrarianOrAdmin();

  if (!input.accessLevels?.length) {
    throw new Error("At least one access level is required.");
  }

  // Build dynamic UPDATE query
  const setParts: string[] = [
    "isbn = $2",
    "title = $3",
    "author = $4",
    "publisher = $5",
    "publication_year = $6",
    "genre = $7",
    "language = $8",
    "description = $9",
  ];

  const params: any[] = [
    input.id,
    input.isbn,
    input.title,
    input.author,
    input.publisher,
    input.publicationYear,
    input.genre,
    input.language,
    input.description ?? null,
  ];

  let paramIndex = params.length + 1;

  if (input.pdfUrl !== undefined) {
    setParts.push(`pdf_url = $${paramIndex}`);
    params.push(input.pdfUrl);
    paramIndex++;
  }
  if (input.coverUrl !== undefined) {
    setParts.push(`cover_url = $${paramIndex}`);
    params.push(input.coverUrl);
    paramIndex++;
  }
  if (input.pageCount !== undefined) {
    setParts.push(`page_count = $${paramIndex}`);
    params.push(input.pageCount);
    paramIndex++;
  }

  try {
    // Update book metadata
    await queryWithContext(
      user.userId,
      `UPDATE books SET ${setParts.join(", ")} WHERE id = $1`,
      params,
    );

    // Delete existing access levels
    await queryWithContext(
      user.userId,
      `DELETE FROM book_access WHERE book_id = $1`,
      [input.id],
    );

    // Insert new access levels
    if (input.accessLevels.length > 0) {
      const accessValues = input.accessLevels
        .map((level, idx) => `($1, $${idx + 2})`)
        .join(", ");

      await queryWithContext(
        user.userId,
        `INSERT INTO book_access (book_id, access_level) VALUES ${accessValues}`,
        [input.id, ...input.accessLevels],
      );
    }
  } catch (error) {
    console.error("Book update error:", error);
    throw error;
  }

  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard/librarian");

  return { success: true };
};

export const deleteBook = async (input: { id: number }) => {
  await ensureLibrarianOrAdmin();

  const supabaseAdmin = getSupabaseAdminClient();
  const minioClient = getMinioClient();
  const bucketName = getMinioBucketName();

  const { data: book, error: bookError } = await supabaseAdmin
    .from("books")
    .select("pdf_url, cover_url")
    .eq("id", input.id)
    .single();

  if (bookError) {
    throw new Error("Unable to locate book for deletion.");
  }

  const pdfObjectKey = getObjectKeyFromPublicUrl(book?.pdf_url);
  const coverObjectKey = getObjectKeyFromPublicUrl(book?.cover_url);

  for (const objectKey of [pdfObjectKey, coverObjectKey]) {
    if (!objectKey) continue;
    await minioClient.removeObject(bucketName, objectKey);
  }

  const { error } = await supabaseAdmin
    .from("books")
    .delete()
    .eq("id", input.id);

  if (error) {
    console.error("Book delete error:", error);
    throw error;
  }

  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard/librarian");

  return { success: true };
};

export const generateQuizForBook = async (input: { bookId: number }) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to generate a quiz.");
  }

  // Rate limiting: 10 requests per hour per user
  const rateLimitCheck = await checkRateLimit(
    `user:${user.id}`,
    "quizGeneration",
  );
  if (rateLimitCheck.exceeded) {
    const resetTime = rateLimitCheck.reset
      ? new Date(rateLimitCheck.reset).toLocaleTimeString()
      : "soon";
    throw new Error(`Rate limit exceeded. Please try again at ${resetTime}.`);
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select(
      "id, title, author, genre, description, pdf_url, original_file_url, page_text_content, text_extracted_at",
    )
    .eq("id", input.bookId)
    .single();

  if (bookError || !book) {
    throw new Error("Book not found.");
  }

  const quizQuestionCount = 5;

  const textContent =
    book.text_extracted_at && book.page_text_content
      ? (book.page_text_content as {
          pages: {
            pageNumber: number;
            text: string;
            wordCount?: number;
          }[];
          totalWords: number;
        })
      : null;

  const pages =
    textContent?.pages?.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.text,
      wordCount: page.wordCount,
    })) || [];

  const pdfUrl = book.original_file_url || book.pdf_url || undefined;

  if (!pages.length && !pdfUrl) {
    throw new Error("No extracted text or PDF available for quiz generation.");
  }

  const aiResult = await AIService.generateQuiz({
    title: book.title ?? "Untitled",
    author: book.author ?? undefined,
    genre: book.genre ?? undefined,
    description: book.description ?? undefined,
    quizType: "classroom",
    questionCount: quizQuestionCount,
    pages: pages.length ? pages : undefined,
    totalWords: textContent?.totalWords,
    pdfUrl,
    contentSource: pages.length ? "extracted_text" : pdfUrl ? "pdf" : undefined,
  });

  const quizPayload = aiResult.quiz;

  const { data: inserted, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      book_id: book.id,
      created_by_id: user.id,
      questions: quizPayload,
    })
    .select("id")
    .single();

  if (quizError || !inserted) {
    throw quizError ?? new Error("Failed to save quiz.");
  }

  revalidatePath("/dashboard/library");
  return { quizId: inserted.id, quiz: quizPayload };
};

export const generateQuizForBookWithContent = async (input: {
  bookId: number;
  pageRangeStart?: number;
  pageRangeEnd?: number;
  quizType: "checkpoint" | "classroom";
  checkpointPage?: number;
  questionCount?: number;
}) => {
  // Use admin client to bypass RLS policy recursion issues
  const user = await ensureLibrarianOrAdmin();

  const supabase = getSupabaseAdminClient();

  // Rate limiting: 10 requests per hour per user
  const rateLimitCheck = await checkRateLimit(
    `user:${user.id}`,
    "quizGeneration",
  );
  if (rateLimitCheck.exceeded) {
    const resetTime = rateLimitCheck.reset
      ? new Date(rateLimitCheck.reset).toLocaleTimeString()
      : "soon";
    throw new Error(`Rate limit exceeded. Please try again at ${resetTime}.`);
  }

  // Validate input
  if (input.quizType === "checkpoint" && !input.checkpointPage) {
    throw new Error("Checkpoint page is required for checkpoint quizzes.");
  }

  // Fetch book data including extracted text
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select(
      "id, title, author, genre, description, page_count, page_text_content, text_extracted_at, pdf_url, original_file_url",
    )
    .eq("id", input.bookId)
    .single();

  if (bookError || !book) {
    throw new Error("Book not found.");
  }

  const textContent =
    book.text_extracted_at && book.page_text_content
      ? (book.page_text_content as {
          pages: { pageNumber: number; text: string; wordCount?: number }[];
          totalPages: number;
          totalWords: number;
        })
      : null;

  const questionCount = input.questionCount ?? 5;
  let pagesPayload:
    | { pageNumber: number; text: string; wordCount?: number }[]
    | null = null;
  let totalWords = 0;
  let contentSource = "description";

  if (textContent) {
    const startPage = input.pageRangeStart ?? 1;
    const endPage = input.pageRangeEnd ?? textContent.totalPages;

    const pagesInRange = textContent.pages.filter(
      (p) => p.pageNumber >= startPage && p.pageNumber <= endPage,
    );

    const filteredPages = pagesInRange.filter(
      (page) => page.text && page.text.trim().length > 0,
    );

    if (filteredPages.length) {
      pagesPayload = filteredPages;
      totalWords =
        filteredPages.reduce(
          (sum, page) =>
            sum + (page.wordCount ?? page.text.split(/\s+/).length),
          0,
        ) || textContent.totalWords;
      contentSource = `pages ${startPage}-${endPage}`;
    }
  }

  if (!pagesPayload) {
    const fallbackText = book.description || "";
    if (!fallbackText) {
      throw new Error(
        "No book content available. Please add a description or extract text from the PDF.",
      );
    }

    const wordCount = fallbackText.split(/\s+/).length;
    pagesPayload = [
      {
        pageNumber: 0,
        text: fallbackText,
        wordCount,
      },
    ];
    totalWords = wordCount;
    contentSource =
      textContent && textContent.pages.length
        ? "description (fallback - insufficient text extracted)"
        : "description";
  }

  const pdfUrl = book.original_file_url || book.pdf_url || undefined;

  const aiResult = await AIService.generateQuiz({
    title: book.title ?? "Untitled",
    author: book.author ?? undefined,
    genre: book.genre ?? undefined,
    description: book.description ?? undefined,
    quizType: input.quizType,
    questionCount,
    checkpointPage: input.checkpointPage,
    pageRangeStart: input.pageRangeStart,
    pageRangeEnd: input.pageRangeEnd,
    pages: pagesPayload,
    totalWords,
    pdfUrl,
    contentSource,
  });

  const quizPayload = aiResult.quiz;

  const { data: inserted, error: quizError } = await supabase
    .from("quizzes")
    .insert({
      book_id: book.id,
      created_by_id: user.id,
      questions: quizPayload,
      quiz_type: input.quizType,
      page_range_start: input.pageRangeStart,
      page_range_end: input.pageRangeEnd,
      checkpoint_page: input.checkpointPage,
    })
    .select("id")
    .single();

  if (quizError || !inserted) {
    throw quizError ?? new Error("Failed to save quiz.");
  }

  if (input.quizType === "checkpoint" && input.checkpointPage) {
    const { error: checkpointError } = await supabase
      .from("quiz_checkpoints")
      .insert({
        book_id: book.id,
        page_number: input.checkpointPage,
        quiz_id: inserted.id,
        is_required: true,
        created_by_id: user.id,
      });

    if (checkpointError) {
      console.error("Failed to create checkpoint record:", checkpointError);
      // Don't fail the whole operation, just log the error
    }
  }

  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard/librarian");

  return {
    quizId: inserted.id,
    quiz: quizPayload,
    contentSource,
    questionCount: quizPayload.questions.length || questionCount,
  };
};

export const autoGenerateCheckpoints = async (input: {
  bookId: number;
  customPages?: number[];
}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to generate checkpoints.");
  }

  // Fetch book data
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, page_count, page_text_content, text_extracted_at")
    .eq("id", input.bookId)
    .single();

  if (bookError || !book) {
    throw new Error("Book not found.");
  }

  if (!book.page_count) {
    throw new Error("Book page count not available.");
  }

  // Import helper functions
  const { suggestCheckpoints, suggestQuestionCount } =
    await import("@/lib/pdf-extractor");

  // Determine checkpoint pages
  const checkpointPages =
    input.customPages ?? suggestCheckpoints(book.page_count);

  if (checkpointPages.length === 0) {
    throw new Error("No checkpoints to generate. Book may be too short.");
  }

  const suggestedCheckpoints: Array<{
    page: number;
    questionCount: number;
    preview: string;
  }> = [];

  // Calculate page ranges for each checkpoint
  let previousPage = 1;
  for (const checkpointPage of checkpointPages) {
    const pageRangeStart = previousPage;
    const pageRangeEnd = checkpointPage;
    const pageRange = pageRangeEnd - pageRangeStart + 1;
    const questionCount = suggestQuestionCount(pageRange);

    suggestedCheckpoints.push({
      page: checkpointPage,
      questionCount,
      preview: `Quiz about pages ${pageRangeStart}-${pageRangeEnd} (${questionCount} questions)`,
    });

    previousPage = checkpointPage + 1;
  }

  return {
    bookId: book.id,
    bookTitle: book.title,
    totalPages: book.page_count,
    suggestedCheckpoints,
    hasExtractedText: !!book.text_extracted_at,
    status: "pending_approval",
  };
};

// ============================================================================
// Quiz Management Actions
// ============================================================================

export const getQuizzesForBook = async (bookId: number) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to view quizzes.");
  }

  // Query quizzes with statistics
  const { data: quizzes, error } = await supabase
    .from("quiz_statistics")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching quizzes:", error);
    throw error;
  }

  return quizzes || [];
};

export const getAllQuizzesGroupedByBook = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to view quizzes.");
  }

  // Get all quizzes with book information and statistics
  const { data: quizzes, error } = await supabase
    .from("quiz_statistics")
    .select(
      `
      *,
      book:books!quizzes_book_id_fkey(id, title, author)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching quizzes:", error);
    throw error;
  }

  // Group by book
  const grouped: Record<number, QuizStatisticsWithBook[]> = {};
  quizzes?.forEach((quiz) => {
    const bookId = quiz.book_id;
    if (!grouped[bookId]) {
      grouped[bookId] = [];
    }
    grouped[bookId].push(quiz);
  });

  return { quizzes: quizzes || [], groupedByBook: grouped };
};

export const publishQuiz = async (quizId: number) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to publish quizzes.");
  }

  const { error } = await supabase
    .from("quizzes")
    .update({
      status: "published",
      is_published: true,
    })
    .eq("id", quizId);

  if (error) {
    console.error("Error publishing quiz:", error);
    throw error;
  }

  revalidatePath("/dashboard/librarian");
  revalidatePath("/dashboard/library");
};

export const unpublishQuiz = async (quizId: number) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to unpublish quizzes.");
  }

  const { error } = await supabase
    .from("quizzes")
    .update({
      status: "draft",
      is_published: false,
    })
    .eq("id", quizId);

  if (error) {
    console.error("Error unpublishing quiz:", error);
    throw error;
  }

  revalidatePath("/dashboard/librarian");
  revalidatePath("/dashboard/library");
};

export const archiveQuiz = async (quizId: number) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to archive quizzes.");
  }

  const { error } = await supabase
    .from("quizzes")
    .update({
      status: "archived",
      is_published: false,
    })
    .eq("id", quizId);

  if (error) {
    console.error("Error archiving quiz:", error);
    throw error;
  }

  revalidatePath("/dashboard/librarian");
  revalidatePath("/dashboard/library");
};

export const deleteQuiz = async (quizId: number) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete quizzes.");
  }

  // Use admin client to avoid RLS recursion issues when checking attempts
  const supabaseAdmin = getSupabaseAdminClient();

  // Check if quiz has any attempts
  const { data: attempts, error: checkError } = await supabaseAdmin
    .from("quiz_attempts")
    .select("id")
    .eq("quiz_id", quizId)
    .limit(1);

  if (checkError) {
    console.error("Error checking quiz attempts:", checkError);
    throw checkError;
  }

  if (attempts && attempts.length > 0) {
    throw new Error(
      "Cannot delete quiz that has been attempted. Archive it instead.",
    );
  }

  // Delete quiz using admin client as well
  const { error } = await supabaseAdmin
    .from("quizzes")
    .delete()
    .eq("id", quizId);

  if (error) {
    console.error("Error deleting quiz:", error);
    throw error;
  }

  revalidatePath("/dashboard/librarian");
  revalidatePath("/dashboard/library");
};

export const updateQuizMetadata = async (input: {
  quizId: number;
  title?: string;
  tags?: string[];
}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update quizzes.");
  }

  // Get current quiz data
  const { data: quiz, error: fetchError } = await supabase
    .from("quizzes")
    .select("questions")
    .eq("id", input.quizId)
    .single();

  if (fetchError || !quiz) {
    throw new Error("Quiz not found.");
  }

  const quizData = quiz.questions as QuizQuestionsData;
  const updateData: Partial<{ questions: QuizQuestionsData; tags: string[] }> =
    { questions: quizData };

  // Update title in the questions JSONB if provided
  if (input.title !== undefined) {
    updateData.questions = {
      ...quizData,
      title: input.title,
    };
  }

  // Update tags if provided
  if (input.tags !== undefined) {
    updateData.tags = input.tags;
  }

  const { error } = await supabase
    .from("quizzes")
    .update(updateData)
    .eq("id", input.quizId);

  if (error) {
    console.error("Error updating quiz:", error);
    throw error;
  }

  revalidatePath("/dashboard/librarian");
  revalidatePath("/dashboard/library");
};

export const renderBookImages = async (bookId: number) => {
  "use server";

  const user = await getCurrentUser();

  if (!user || !user.userId) {
    return { error: "Not authenticated" };
  }

  // Check if book exists
  const bookResult = await queryWithContext(
    user.userId,
    `SELECT id, title FROM books WHERE id = $1`,
    [bookId],
  );

  if (bookResult.rows.length === 0) {
    return { error: "Book not found" };
  }

  const book = bookResult.rows[0];

  // Create or update render job
  const existingJobResult = await queryWithContext(
    user.userId,
    `SELECT id, status FROM book_render_jobs
     WHERE book_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookId],
  );

  let jobId: number;

  if (
    existingJobResult.rows.length > 0 &&
    existingJobResult.rows[0].status === "pending"
  ) {
    jobId = existingJobResult.rows[0].id;
  } else {
    const newJobResult = await queryWithContext(
      user.userId,
      `INSERT INTO book_render_jobs (book_id, status)
       VALUES ($1, $2)
       RETURNING id`,
      [bookId, "pending"],
    );

    if (newJobResult.rows.length === 0) {
      return { error: "Failed to create render job" };
    }

    jobId = newJobResult.rows[0].id;
  }

  // Trigger rendering in background (non-blocking)
  // Note: In production, this should use a proper job queue
  const { spawn } = await import("child_process");
  const scriptPath = `${process.cwd()}/scripts/render-book-images.ts`;

  spawn("npx", ["tsx", scriptPath, `--bookId=${bookId}`], {
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      PATH: "/opt/homebrew/opt/node@20/bin:" + process.env.PATH,
    },
  }).unref();

  return {
    success: true,
    message: `Rendering started for "${book.title}". This may take a few minutes.`,
    jobId,
  };
};

export const checkRenderStatus = async (bookId: number) => {
  "use server";

  const user = await getCurrentUser();

  if (!user || !user.userId) {
    return { completed: false, message: "Not authenticated" };
  }

  // Check book's page_images_count
  const bookResult = await queryWithContext(
    user.userId,
    `SELECT page_images_count, page_images_rendered_at
     FROM books
     WHERE id = $1`,
    [bookId],
  );

  const book = bookResult.rows[0];

  if (book?.page_images_count && book.page_images_count > 0) {
    return {
      completed: true,
      pageCount: book.page_images_count,
      renderedAt: book.page_images_rendered_at,
    };
  }

  // Check latest render job status
  const { data: job } = await supabase
    .from("book_render_jobs")
    .select("status, error_message, processed_pages, total_pages")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    completed: false,
    status: job?.status || "unknown",
    error: job?.error_message,
    processedPages: job?.processed_pages || 0,
    totalPages: job?.total_pages || 0,
  };
};

/*
  Ollama prompt (reference only, currently not used because the RAG API yields better descriptions):

  You are an editorial copywriter. Use the provided book content to craft an enticing teaser in English.

  Rules:
  - 2-3 sentences, 40-60 words total.
  - Start immediately with the hook—no preamble, labels, or framing (e.g., "Here is", "This is", "Rewritten description").
  - Include one vivid detail (character, setting, conflict, or fact) to prove you've read it.
  - Use active, sensory language and hint at the stakes; make it feel urgent and inviting without spoilers.
  - Finish with a hook that leaves tension or a question in the reader's mind.
  - Avoid filler like "this book" or "the author" unless you naturally name them.
  - Keep it inviting and spoiler-light; avoid repeating the title/author unless it fits naturally.
  - Output only the finished description text—no markdown or labels.
*/

export const generateBookDescription = async (input: {
  title: string;
  author: string;
  genre?: string;
  pageCount?: number;
  textPreview?: string;
  pdfUrl?: string;
  bookId?: number;
}) => {
  "use server";

  const user = await ensureLibrarianOrAdmin();

  try {
    let bookRecord: {
      title: string | null;
      pdf_url: string | null;
      original_file_url: string | null;
      page_text_content: any;
      text_extracted_at: string | null;
    } | null = null;

    if (input.bookId) {
      const result = await queryWithContext(
        user.userId,
        `SELECT title, pdf_url, original_file_url, page_text_content, text_extracted_at
         FROM books
         WHERE id = $1`,
        [input.bookId],
      );

      if (result.rows.length === 0) {
        throw new Error(`Book not found with ID: ${input.bookId}`);
      }

      bookRecord = result.rows[0];
    }

    const textContent =
      bookRecord?.text_extracted_at && bookRecord.page_text_content
        ? (bookRecord.page_text_content as {
            pages: { pageNumber: number; text: string }[];
            totalWords: number;
          })
        : null;

    const pagesFromText = textContent?.pages?.map((page) => ({
      pageNumber: page.pageNumber,
      text: page.text,
      wordCount:
        (page as { wordCount?: number }).wordCount ??
        page.text.split(/\s+/).length,
    }));

    const previewPage =
      !pagesFromText?.length && input.textPreview
        ? [
            {
              pageNumber: 0,
              text: input.textPreview,
              wordCount: input.textPreview.split(/\s+/).length,
            },
          ]
        : null;

    const pdfUrl =
      input.pdfUrl ||
      bookRecord?.original_file_url ||
      bookRecord?.pdf_url ||
      undefined;

    if (!pagesFromText?.length && !previewPage?.length && !pdfUrl) {
      return {
        success: false,
        message:
          "No extracted text or PDF file available for description generation",
      };
    }

    const aiResult = await AIService.generateDescription({
      title: input.title || bookRecord?.title || "Untitled",
      author: input.author,
      genre: input.genre,
      pages: pagesFromText?.length ? pagesFromText : previewPage || undefined,
      totalWords: pagesFromText?.length
        ? textContent?.totalWords
        : previewPage?.[0]?.wordCount,
      textPreview: input.textPreview,
      pdfUrl,
    });

    return {
      success: true,
      description: aiResult.description,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `AI generation failed: ${message}`,
    };
  }
};

export const extractBookText = async (bookId: number) => {
  "use server";

  await ensureLibrarianOrAdmin();

  const supabase = getSupabaseAdminClient();

  // Get book URL and format
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select(
      "id, title, pdf_url, file_format, original_file_url, text_extraction_attempts",
    )
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    return {
      success: false,
      message: "Book not found",
      errorType: "not_found",
    };
  }

  const fileUrl = book.original_file_url || book.pdf_url;
  if (!fileUrl) {
    return {
      success: false,
      message: "Book has no file URL",
      errorType: "missing_file",
    };
  }

  const fileFormat = book.file_format || "pdf";

  // Update attempt tracking before processing
  await supabase
    .from("books")
    .update({
      text_extraction_attempts: (book.text_extraction_attempts || 0) + 1,
      last_extraction_attempt_at: new Date().toISOString(),
    })
    .eq("id", bookId);

  try {
    let textContent;
    let pdfUrlToExtract = fileUrl;

    // For EPUB and MOBI/AZW files, we need to use the converted PDF
    if (["epub", "mobi", "azw", "azw3"].includes(fileFormat)) {
      // Get the converted PDF URL from the book record
      const convertedPdfUrl = book.pdf_url;

      if (!convertedPdfUrl) {
        const errorMsg = `${fileFormat.toUpperCase()} file has not been converted to PDF yet. Please render the book first.`;

        // Store error in database
        await supabase
          .from("books")
          .update({ text_extraction_error: errorMsg })
          .eq("id", bookId);

        return {
          success: false,
          message: errorMsg,
          errorType: "conversion_required",
        };
      }

      pdfUrlToExtract = convertedPdfUrl;
    }

    // Extract text from PDF (either original PDF or converted from EPUB/MOBI/AZW)
    const { extractTextFromPDF } = await import("@/lib/pdf-extractor");
    textContent = await extractTextFromPDF(pdfUrlToExtract);

    // Check if meaningful text was extracted
    if (textContent.totalWords < 10) {
      const errorMsg =
        "PDF appears to be image-based with no extractable text. OCR support coming soon.";

      await supabase
        .from("books")
        .update({ text_extraction_error: errorMsg })
        .eq("id", bookId);

      return {
        success: false,
        message: errorMsg,
        errorType: "insufficient_text",
        totalWords: textContent.totalWords,
      };
    }

    // Save to database - clear any previous errors
    const { error: updateError } = await supabase
      .from("books")
      .update({
        page_text_content: {
          pages: textContent.pages,
          totalPages: textContent.totalPages,
          totalWords: textContent.totalWords,
          extractionMethod: textContent.extractionMethod,
        },
        text_extracted_at: new Date().toISOString(),
        text_extraction_method: textContent.extractionMethod,
        text_extraction_error: null, // Clear previous errors on success
      })
      .eq("id", bookId);

    if (updateError) {
      // Store database error
      await supabase
        .from("books")
        .update({ text_extraction_error: updateError.message })
        .eq("id", bookId);

      return {
        success: false,
        message: updateError.message,
        errorType: "database_error",
      };
    }

    return {
      success: true,
      message: `Text extracted: ${textContent.totalPages} pages, ${textContent.totalWords} words`,
      totalPages: textContent.totalPages,
      totalWords: textContent.totalWords,
      extractionMethod: textContent.extractionMethod,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const errorMsg = `Text extraction failed: ${message}`;

    // Store error in database
    await supabase
      .from("books")
      .update({ text_extraction_error: errorMsg })
      .eq("id", bookId);

    return {
      success: false,
      message: errorMsg,
      errorType: "extraction_error",
      details: message,
    };
  }
};

export const convertEpubToImages = async (bookId: number) => {
  "use server";

  const user = await ensureLibrarianOrAdmin();

  // Get book details
  const bookResult = await queryWithContext(
    user.userId,
    `SELECT id, title, file_format, original_file_url, pdf_url
     FROM books
     WHERE id = $1`,
    [bookId],
  );

  if (bookResult.rows.length === 0) {
    return { success: false, message: "Book not found" };
  }

  const book = bookResult.rows[0];

  if (book.file_format !== "epub") {
    return { success: false, message: "Book is not an EPUB file" };
  }

  const epubUrl = book.original_file_url || book.pdf_url;
  if (!epubUrl) {
    return { success: false, message: "EPUB file URL not found" };
  }

  try {
    // Step 1: Convert EPUB to PDF using Calibre
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/convert-epub`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, epubUrl }),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        message: result.error || "EPUB to PDF conversion failed",
      };
    }

    console.log(`EPUB converted to PDF: ${result.pdfUrl}`);

    // Step 2: Trigger PDF rendering using existing pipeline
    const renderResult = await renderBookImages(bookId);

    if (!renderResult.success) {
      return {
        success: false,
        message: `PDF created but rendering failed: ${renderResult.message || "Unknown error"}`,
      };
    }

    return {
      success: true,
      message: `EPUB converted to PDF and rendering started for "${book.title}"`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `EPUB conversion failed: ${message}` };
  }
};

export const convertMobiToImages = async (bookId: number) => {
  "use server";

  await ensureLibrarianOrAdmin();

  const supabase = getSupabaseAdminClient();

  // Get book details
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title, file_format, original_file_url, pdf_url")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    return { success: false, message: "Book not found" };
  }

  if (!["mobi", "azw", "azw3"].includes(book.file_format || "")) {
    return { success: false, message: "Book is not a MOBI/AZW/AZW3 file" };
  }

  const mobiUrl = book.original_file_url || book.pdf_url;
  if (!mobiUrl) {
    return { success: false, message: "MOBI/AZW file URL not found" };
  }

  try {
    // Step 1: Convert MOBI/AZW/AZW3 to PDF using Calibre
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/convert-mobi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        mobiUrl,
        format: book.file_format as "mobi" | "azw" | "azw3",
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        message: result.error || "MOBI/AZW to PDF conversion failed",
      };
    }

    const formatUpper = book.file_format?.toUpperCase();
    console.log(`${formatUpper} converted to PDF: ${result.pdfUrl}`);

    // Step 2: Trigger PDF rendering using existing pipeline
    const renderResult = await renderBookImages(bookId);

    if (!renderResult.success) {
      return {
        success: false,
        message: `PDF created but rendering failed: ${renderResult.message || "Unknown error"}`,
      };
    }

    return {
      success: true,
      message: `${formatUpper} converted to PDF and rendering started for "${book.title}"`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      message: `MOBI/AZW conversion failed: ${message}`,
    };
  }
};
