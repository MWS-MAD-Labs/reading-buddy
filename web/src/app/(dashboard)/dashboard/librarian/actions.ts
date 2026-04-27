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
  QuizQuestionsData,
  QuizStatisticsWithBook,
} from "@/types/database";
import { checkRateLimit } from "@/lib/middleware/withRateLimit";
import { AIService } from "@/lib/ai";

type ManagedUser = {
  userId: string;
  email?: string | null;
  profileId: string;
  role?: string | null;
};

type SupportedFileFormat = "pdf" | "epub" | "mobi" | "azw" | "azw3";
type ReadyFormat = "epub" | "pdf_text" | "pdf_images";

type QuizStatisticRow = {
  id: number;
  book_id: number;
  quiz_type: string | null;
  status: string | null;
  is_published: boolean | null;
  created_at: string;
  page_range_start: number | null;
  page_range_end: number | null;
  checkpoint_page: number | null;
  attempt_count: number | null;
  average_score: number | null;
  avg_score?: number | null;
  last_attempted_at: string | null;
  question_count: number | null;
};

const sanitizeFilename = (filename: string) =>
  filename.replace(/[^a-zA-Z0-9_.-]/g, "_");

const ensureLibrarianOrAdmin = async (): Promise<ManagedUser> => {
  const user = await getCurrentUser();

  if (!user || !user.userId || !user.profileId) {
    throw new Error("You must be signed in to manage books.");
  }

  const result = await queryWithContext<{ role: string | null }>(
    user.userId,
    `SELECT role FROM profiles WHERE id = $1`,
    [user.profileId],
  );

  if (result.rows.length === 0) {
    throw new Error(
      "No profile found for your account. Please contact admin to set up your profile.",
    );
  }

  const role = result.rows[0]?.role;
  if (!role || !["LIBRARIAN", "ADMIN"].includes(role)) {
    throw new Error(
      `Insufficient permissions. Your current role is: ${role || "unknown"}. Only LIBRARIAN or ADMIN users can manage books.`,
    );
  }

  return {
    userId: user.userId,
    email: user.email,
    profileId: user.profileId,
    role,
  };
};

const revalidateLibraryPaths = (bookId?: number) => {
  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard/librarian");
  if (bookId) {
    revalidatePath(`/dashboard/student/read/${bookId}`);
    revalidatePath(`/dashboard/journal/${bookId}`);
  }
};

const buildQuizStatisticsRow = (row: QuizStatisticRow) => ({
  id: row.id,
  book_id: row.book_id,
  quiz_type: row.quiz_type || "classroom",
  status: row.status || "draft",
  is_published: row.is_published ?? false,
  created_at: row.created_at,
  page_range_start: row.page_range_start,
  page_range_end: row.page_range_end,
  checkpoint_page: row.checkpoint_page,
  attempt_count: Number(row.attempt_count || 0),
  average_score:
    row.average_score !== null && row.average_score !== undefined
      ? Number(row.average_score)
      : row.avg_score !== null && row.avg_score !== undefined
        ? Number(row.avg_score)
        : null,
  last_attempted_at: row.last_attempted_at,
  question_count: Number(row.question_count || 0),
});

export const checkCurrentUserRole = async () => {
  const user = await getCurrentUser();

  if (!user || !user.userId) {
    return { error: "Not signed in" };
  }

  try {
    const result = await queryWithContext<{
      role: string | null;
      full_name: string | null;
    }>(user.userId, `SELECT role, full_name FROM profiles WHERE user_id = $1`, [
      user.userId,
    ]);

    const profiles = result.rows;
    const hasDuplicates = profiles.length > 1;
    const profile = profiles[0] ?? null;

    return {
      userId: user.userId,
      email: user.email,
      profile,
      profileError: null,
      hasDuplicates,
      profileCount: profiles.length,
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
  fileFormat?: SupportedFileFormat;
  fileSizeBytes?: number;
  isPictureBook?: boolean;
}) => {
  const user = await ensureLibrarianOrAdmin();

  const result = await queryWithContext<{ id: number }>(
    user.userId,
    `INSERT INTO books (
      isbn,
      title,
      author,
      publisher,
      publication_year,
      genre,
      language,
      description,
      page_count,
      pdf_url,
      cover_url,
      file_format,
      original_file_url,
      file_size_bytes,
      is_picture_book
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15
    )
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
      input.fileFormat ?? "pdf",
      input.pdfUrl,
      input.fileSizeBytes ?? null,
      input.isPictureBook ?? false,
    ],
  );

  const insertedBook = result.rows[0];
  if (!insertedBook) {
    throw new Error("Unable to insert book.");
  }

  if (input.accessLevels.length > 0) {
    const values = input.accessLevels
      .map((_, idx) => `($1, $${idx + 2})`)
      .join(", ");

    await queryWithContext(
      user.userId,
      `INSERT INTO book_access (book_id, access_level) VALUES ${values}`,
      [insertedBook.id, ...input.accessLevels],
    );
  }

  revalidateLibraryPaths(insertedBook.id);

  return { bookId: insertedBook.id };
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
  pdfUrl?: string | null;
  coverUrl?: string;
  pageCount?: number | null;
  isPictureBook?: boolean;
  fileFormat?: SupportedFileFormat;
  originalFileUrl?: string | null;
  fileSizeBytes?: number | null;
  resetDerivedData?: boolean;
}) => {
  const user = await ensureLibrarianOrAdmin();

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

  const params: Array<string | number | boolean | null> = [
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

  if (input.isPictureBook !== undefined) {
    setParts.push(`is_picture_book = $${paramIndex}`);
    params.push(input.isPictureBook);
    paramIndex++;
  }

  if (input.fileFormat !== undefined) {
    setParts.push(`file_format = $${paramIndex}`);
    params.push(input.fileFormat);
    paramIndex++;
  }

  if (input.originalFileUrl !== undefined) {
    setParts.push(`original_file_url = $${paramIndex}`);
    params.push(input.originalFileUrl);
    paramIndex++;
  }

  if (input.fileSizeBytes !== undefined) {
    setParts.push(`file_size_bytes = $${paramIndex}`);
    params.push(input.fileSizeBytes);
    paramIndex++;
  }

  if (input.resetDerivedData) {
    setParts.push("page_images_prefix = NULL");
    setParts.push("page_images_count = NULL");
    setParts.push("page_images_rendered_at = NULL");
    setParts.push("text_json_url = NULL");
    setParts.push("page_text_content = NULL");
    setParts.push("text_extracted_at = NULL");
    setParts.push("text_extraction_method = NULL");
    setParts.push("text_extraction_status = NULL");
    setParts.push("text_extraction_error = NULL");
  }

  await queryWithContext(
    user.userId,
    `UPDATE books SET ${setParts.join(", ")} WHERE id = $1`,
    params,
  );

  await queryWithContext(
    user.userId,
    `DELETE FROM book_access WHERE book_id = $1`,
    [input.id],
  );

  if (input.accessLevels.length > 0) {
    const values = input.accessLevels
      .map((_, idx) => `($1, $${idx + 2})`)
      .join(", ");

    await queryWithContext(
      user.userId,
      `INSERT INTO book_access (book_id, access_level) VALUES ${values}`,
      [input.id, ...input.accessLevels],
    );
  }

  revalidateLibraryPaths(input.id);

  return { success: true };
};

export const deleteBook = async (input: { id: number }) => {
  const user = await ensureLibrarianOrAdmin();

  const minioClient = getMinioClient();
  const bucketName = getMinioBucketName();

  const result = await queryWithContext<{
    pdf_url: string | null;
    cover_url: string | null;
    original_file_url: string | null;
    text_json_url: string | null;
    page_images_prefix: string | null;
  }>(
    user.userId,
    `SELECT pdf_url, cover_url, original_file_url, text_json_url, page_images_prefix
     FROM books
     WHERE id = $1`,
    [input.id],
  );

  const book = result.rows[0];
  if (!book) {
    throw new Error("Unable to locate book for deletion.");
  }

  const objectKeys = [
    getObjectKeyFromPublicUrl(book.pdf_url),
    getObjectKeyFromPublicUrl(book.cover_url),
    getObjectKeyFromPublicUrl(book.original_file_url),
    getObjectKeyFromPublicUrl(book.text_json_url),
  ].filter((value): value is string => Boolean(value));

  for (const objectKey of objectKeys) {
    try {
      await minioClient.removeObject(bucketName, objectKey);
    } catch (error) {
      console.warn("Failed to remove object from MinIO:", objectKey, error);
    }
  }

  await queryWithContext(user.userId, `DELETE FROM books WHERE id = $1`, [
    input.id,
  ]);

  revalidateLibraryPaths(input.id);

  return { success: true };
};

export const generateQuizForBook = async (input: { bookId: number }) => {
  return generateQuizForBookWithContent({
    bookId: input.bookId,
    quizType: "classroom",
    questionCount: 5,
  });
};

export const generateQuizForBookWithContent = async (input: {
  bookId: number;
  pageRangeStart?: number;
  pageRangeEnd?: number;
  quizType: "checkpoint" | "classroom";
  checkpointPage?: number;
  questionCount?: number;
}) => {
  const user = await ensureLibrarianOrAdmin();

  const rateLimitCheck = await checkRateLimit(
    `user:${user.userId}`,
    "quizGeneration",
  );
  if (rateLimitCheck.exceeded) {
    const resetTime = rateLimitCheck.reset
      ? new Date(rateLimitCheck.reset).toLocaleTimeString()
      : "soon";
    throw new Error(`Rate limit exceeded. Please try again at ${resetTime}.`);
  }

  if (input.quizType === "checkpoint" && !input.checkpointPage) {
    throw new Error("Checkpoint page is required for checkpoint quizzes.");
  }

  const bookResult = await queryWithContext<{
    id: number;
    title: string | null;
    author: string | null;
    genre: string | null;
    description: string | null;
    page_count: number | null;
    page_text_content: {
      pages: { pageNumber: number; text: string; wordCount?: number }[];
      totalPages?: number;
      totalWords?: number;
    } | null;
    text_extracted_at: string | null;
    pdf_url: string | null;
    original_file_url: string | null;
  }>(
    user.userId,
    `SELECT
      id,
      title,
      author,
      genre,
      description,
      page_count,
      page_text_content,
      text_extracted_at,
      pdf_url,
      original_file_url
     FROM books
     WHERE id = $1`,
    [input.bookId],
  );

  const book = bookResult.rows[0];
  if (!book) {
    throw new Error("Book not found.");
  }

  const textContent =
    book.text_extracted_at && book.page_text_content
      ? book.page_text_content
      : null;

  const questionCount = input.questionCount ?? 5;
  let pagesPayload:
    | { pageNumber: number; text: string; wordCount?: number }[]
    | null = null;
  let totalWords = 0;
  let contentSource = "description";

  if (textContent?.pages?.length) {
    const startPage = input.pageRangeStart ?? 1;
    const endPage =
      input.pageRangeEnd ??
      textContent.totalPages ??
      Math.max(...textContent.pages.map((page) => page.pageNumber));

    const pagesInRange = textContent.pages.filter(
      (page) => page.pageNumber >= startPage && page.pageNumber <= endPage,
    );

    const filteredPages = pagesInRange.filter(
      (page) => page.text && page.text.trim().length > 0,
    );

    if (filteredPages.length > 0) {
      pagesPayload = filteredPages;
      totalWords =
        filteredPages.reduce(
          (sum, page) =>
            sum + (page.wordCount ?? page.text.split(/\s+/).length),
          0,
        ) ||
        textContent.totalWords ||
        0;
      contentSource = `pages ${startPage}-${endPage}`;
    }
  }

  if (!pagesPayload) {
    const fallbackText = book.description || "";
    if (!fallbackText) {
      throw new Error(
        "No book content available. Please add a description or extract text from the book first.",
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
      textContent && textContent.pages.length > 0
        ? "description (fallback - insufficient extracted text)"
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

  const insertResult = await queryWithContext<{ id: number }>(
    user.userId,
    `INSERT INTO quizzes (
      book_id,
      created_by_id,
      questions,
      quiz_type,
      page_range_start,
      page_range_end,
      checkpoint_page
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [
      book.id,
      user.profileId,
      JSON.stringify(quizPayload),
      input.quizType,
      input.pageRangeStart ?? null,
      input.pageRangeEnd ?? null,
      input.checkpointPage ?? null,
    ],
  );

  const inserted = insertResult.rows[0];
  if (!inserted) {
    throw new Error("Failed to save quiz.");
  }

  if (input.quizType === "checkpoint" && input.checkpointPage) {
    try {
      await queryWithContext(
        user.userId,
        `INSERT INTO quiz_checkpoints (
          book_id,
          page_number,
          quiz_id,
          is_required,
          created_by_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [book.id, input.checkpointPage, inserted.id, true, user.profileId],
      );
    } catch (error) {
      console.error("Failed to create checkpoint record:", error);
    }
  }

  revalidateLibraryPaths(book.id);

  const generatedQuestionCount = Array.isArray(
    (quizPayload as { questions?: unknown[] }).questions,
  )
    ? ((quizPayload as { questions?: unknown[] }).questions?.length ?? 0)
    : 0;

  return {
    quizId: inserted.id,
    quiz: quizPayload,
    contentSource,
    questionCount:
      generatedQuestionCount > 0 ? generatedQuestionCount : questionCount,
  };
};

export const autoGenerateCheckpoints = async (input: {
  bookId: number;
  customPages?: number[];
}) => {
  const user = await ensureLibrarianOrAdmin();

  const bookResult = await queryWithContext<{
    id: number;
    title: string;
    page_count: number | null;
    text_extracted_at: string | null;
  }>(
    user.userId,
    `SELECT id, title, page_count, text_extracted_at
     FROM books
     WHERE id = $1`,
    [input.bookId],
  );

  const book = bookResult.rows[0];
  if (!book) {
    throw new Error("Book not found.");
  }

  if (!book.page_count) {
    throw new Error("Book page count not available.");
  }

  const { suggestCheckpoints, suggestQuestionCount } =
    await import("@/lib/pdf-extractor");

  const checkpointPages =
    input.customPages ?? suggestCheckpoints(book.page_count);
  if (checkpointPages.length === 0) {
    throw new Error("No checkpoints to generate. Book may be too short.");
  }

  let previousPage = 1;
  const suggestedCheckpoints = checkpointPages.map((checkpointPage) => {
    const pageRangeStart = previousPage;
    const pageRangeEnd = checkpointPage;
    const pageRange = pageRangeEnd - pageRangeStart + 1;
    const questionCount = suggestQuestionCount(pageRange);

    previousPage = checkpointPage + 1;

    return {
      page: checkpointPage,
      questionCount,
      preview: `Quiz about pages ${pageRangeStart}-${pageRangeEnd} (${questionCount} questions)`,
    };
  });

  return {
    bookId: book.id,
    bookTitle: book.title,
    totalPages: book.page_count,
    suggestedCheckpoints,
    hasExtractedText: !!book.text_extracted_at,
    status: "pending_approval" as const,
  };
};

export const getQuizzesForBook = async (bookId: number) => {
  const user = await ensureLibrarianOrAdmin();

  const result = await queryWithContext<QuizStatisticRow>(
    user.userId,
    `SELECT *
     FROM quiz_statistics
     WHERE book_id = $1
     ORDER BY created_at DESC`,
    [bookId],
  );

  return result.rows.map(buildQuizStatisticsRow);
};

export const getAllQuizzesGroupedByBook = async () => {
  const user = await ensureLibrarianOrAdmin();

  const result = await queryWithContext<
    QuizStatisticRow & {
      book_title: string;
      book_author: string;
    }
  >(
    user.userId,
    `SELECT
      qs.*,
      b.title AS book_title,
      b.author AS book_author
     FROM quiz_statistics qs
     JOIN books b ON b.id = qs.book_id
     ORDER BY qs.created_at DESC`,
    [],
  );

  const quizzes: Array<
    ReturnType<typeof buildQuizStatisticsRow> & {
      book: {
        id: number;
        title: string;
        author: string;
      };
    }
  > = result.rows.map((row) => ({
    ...buildQuizStatisticsRow(row),
    book: {
      id: row.book_id,
      title: row.book_title,
      author: row.book_author,
    },
  }));

  const groupedByBook = quizzes.reduce<Record<number, typeof quizzes>>(
    (acc, quiz) => {
      if (!acc[quiz.book_id]) {
        acc[quiz.book_id] = [];
      }
      acc[quiz.book_id].push(quiz);
      return acc;
    },
    {},
  );

  return { quizzes, groupedByBook };
};

export const publishQuiz = async (quizId: number) => {
  const user = await ensureLibrarianOrAdmin();

  await queryWithContext(
    user.userId,
    `UPDATE quizzes
     SET status = $1, is_published = $2
     WHERE id = $3`,
    ["published", true, quizId],
  );

  revalidateLibraryPaths();
};

export const unpublishQuiz = async (quizId: number) => {
  const user = await ensureLibrarianOrAdmin();

  await queryWithContext(
    user.userId,
    `UPDATE quizzes
     SET status = $1, is_published = $2
     WHERE id = $3`,
    ["draft", false, quizId],
  );

  revalidateLibraryPaths();
};

export const archiveQuiz = async (quizId: number) => {
  const user = await ensureLibrarianOrAdmin();

  await queryWithContext(
    user.userId,
    `UPDATE quizzes
     SET status = $1, is_published = $2
     WHERE id = $3`,
    ["archived", false, quizId],
  );

  revalidateLibraryPaths();
};

export const deleteQuiz = async (quizId: number) => {
  const user = await ensureLibrarianOrAdmin();

  const attemptsResult = await queryWithContext<{ id: number }>(
    user.userId,
    `SELECT id
     FROM quiz_attempts
     WHERE quiz_id = $1
     LIMIT 1`,
    [quizId],
  );

  if (attemptsResult.rows.length > 0) {
    throw new Error(
      "Cannot delete quiz that has been attempted. Archive it instead.",
    );
  }

  await queryWithContext(user.userId, `DELETE FROM quizzes WHERE id = $1`, [
    quizId,
  ]);

  revalidateLibraryPaths();
};

export const updateQuizMetadata = async (input: {
  quizId: number;
  title?: string;
  tags?: string[];
}) => {
  const user = await ensureLibrarianOrAdmin();

  const quizResult = await queryWithContext<{ questions: QuizQuestionsData }>(
    user.userId,
    `SELECT questions
     FROM quizzes
     WHERE id = $1`,
    [input.quizId],
  );

  const quiz = quizResult.rows[0];
  if (!quiz) {
    throw new Error("Quiz not found.");
  }

  const questions = quiz.questions;
  const updatedQuestions =
    input.title !== undefined
      ? {
          ...questions,
          title: input.title,
        }
      : questions;

  await queryWithContext(
    user.userId,
    `UPDATE quizzes
     SET questions = $1, tags = COALESCE($2, tags)
     WHERE id = $3`,
    [
      JSON.stringify(updatedQuestions),
      input.tags ? input.tags : null,
      input.quizId,
    ],
  );

  revalidateLibraryPaths();
};

export const renderBookImages = async (bookId: number) => {
  const user = await getCurrentUser();

  if (!user || !user.userId) {
    return { success: false, error: "Not authenticated" };
  }

  const actorUserId = user.userId;

  const bookResult = await queryWithContext<{ id: number; title: string }>(
    actorUserId,
    `SELECT id, title FROM books WHERE id = $1`,
    [bookId],
  );

  const book = bookResult.rows[0];
  if (!book) {
    return { success: false, error: "Book not found" };
  }

  const existingJobResult = await queryWithContext<{
    id: number;
    status: string;
  }>(
    actorUserId,
    `SELECT id, status
     FROM book_render_jobs
     WHERE book_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookId],
  );

  let jobId: number;

  if (
    existingJobResult.rows.length > 0 &&
    existingJobResult.rows[0]?.status === "pending"
  ) {
    jobId = existingJobResult.rows[0].id;
  } else {
    const newJobResult = await queryWithContext<{ id: number }>(
      actorUserId,
      `INSERT INTO book_render_jobs (book_id, status)
       VALUES ($1, $2)
       RETURNING id`,
      [bookId, "pending"],
    );

    const inserted = newJobResult.rows[0];
    if (!inserted) {
      return { success: false, error: "Failed to create render job" };
    }

    jobId = inserted.id;
  }

  const { spawn } = await import("child_process");
  const { existsSync } = await import("fs");
  const path = await import("path");

  const scriptCandidates = [
    path.join(process.cwd(), "web", "scripts", "render-book-images.ts"),
    path.join(process.cwd(), "scripts", "render-book-images.ts"),
  ];
  const scriptPath = scriptCandidates.find((candidate) =>
    existsSync(candidate),
  );

  if (!scriptPath) {
    return {
      success: false,
      error:
        "Background rendering worker script not found. Please verify deployment artifacts.",
    };
  }

  const localTsxBinCandidates = [
    path.join(
      process.cwd(),
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tsx.cmd" : "tsx",
    ),
    path.join(
      process.cwd(),
      "..",
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tsx.cmd" : "tsx",
    ),
    path.join(
      process.cwd(),
      "web",
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tsx.cmd" : "tsx",
    ),
  ];
  const localTsxBin = localTsxBinCandidates.find((candidate) =>
    existsSync(candidate),
  );

  const tsxCliCandidates = [
    path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"),
    path.join(process.cwd(), "..", "node_modules", "tsx", "dist", "cli.mjs"),
    path.join(process.cwd(), "web", "node_modules", "tsx", "dist", "cli.mjs"),
  ];
  const tsxCliPath = tsxCliCandidates.find((candidate) =>
    existsSync(candidate),
  );

  let command = "npx";
  let args = ["tsx", scriptPath, `--bookId=${bookId}`];

  if (localTsxBin) {
    command = localTsxBin;
    args = [scriptPath, `--bookId=${bookId}`];
  } else if (tsxCliPath) {
    command = process.execPath;
    args = [tsxCliPath, scriptPath, `--bookId=${bookId}`];
  }

  const webCwdCandidate = path.join(process.cwd(), "web");
  const scriptDir = path.dirname(scriptPath);
  const workerCwd = existsSync(path.join(scriptDir, "..", "tsconfig.json"))
    ? path.resolve(scriptDir, "..")
    : existsSync(path.join(webCwdCandidate, "tsconfig.json"))
      ? webCwdCandidate
      : process.cwd();

  const child = spawn(command, args, {
    detached: false,
    stdio: ["ignore", "pipe", "pipe"],
    cwd: workerCwd,
    env: {
      ...process.env,
    },
  });

  child.stdout?.on("data", (chunk) => {
    console.info(
      `[renderBookImages:book:${bookId}:stdout] ${String(chunk).trim()}`,
    );
  });

  child.stderr?.on("data", (chunk) => {
    console.error(
      `[renderBookImages:book:${bookId}:stderr] ${String(chunk).trim()}`,
    );
  });

  child.on("error", async (error) => {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start render worker process.";

    try {
      await queryWithContext(
        actorUserId,
        `UPDATE book_render_jobs
         SET status = $1, error_message = $2
         WHERE id = $3`,
        ["failed", message, jobId],
      );
    } catch (updateError) {
      console.error(
        "Failed to update render job after spawn error:",
        updateError,
      );
    }
  });

  child.on("exit", async (code, signal) => {
    if (code === 0) {
      return;
    }

    const message = `Render worker exited unexpectedly (code=${code ?? "null"}, signal=${signal ?? "null"})`;

    try {
      await queryWithContext(
        actorUserId,
        `UPDATE book_render_jobs
         SET status = $1, error_message = $2
         WHERE id = $3 AND status IN ($4, $5)`,
        ["failed", message, jobId, "pending", "processing"],
      );
    } catch (updateError) {
      console.error("Failed to update render job after exit:", updateError);
    }
  });

  return {
    success: true,
    message: `Rendering started for "${book.title}". This may take a few minutes.`,
    jobId,
  };
};

export const checkRenderStatus = async (bookId: number) => {
  const user = await getCurrentUser();

  if (!user || !user.userId) {
    return { completed: false, message: "Not authenticated" };
  }

  const bookResult = await queryWithContext<{
    page_images_count: number | null;
    page_images_rendered_at: string | null;
  }>(
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

  const jobResult = await queryWithContext<{
    status: string | null;
    error_message: string | null;
    processed_pages: number | null;
    total_pages: number | null;
  }>(
    user.userId,
    `SELECT status, error_message, processed_pages, total_pages
     FROM book_render_jobs
     WHERE book_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookId],
  );

  const job = jobResult.rows[0];

  return {
    completed: false,
    status: job?.status || "unknown",
    error: job?.error_message || undefined,
    processedPages: job?.processed_pages || 0,
    totalPages: job?.total_pages || 0,
  };
};

export const generateBookDescription = async (input: {
  title: string;
  author: string;
  genre?: string;
  pageCount?: number;
  textPreview?: string;
  pdfUrl?: string;
  bookId?: number;
}) => {
  const user = await ensureLibrarianOrAdmin();

  try {
    let bookRecord: {
      title: string | null;
      pdf_url: string | null;
      original_file_url: string | null;
      page_text_content: {
        pages?: { pageNumber: number; text: string; wordCount?: number }[];
        totalWords?: number;
      } | null;
      text_extracted_at: string | null;
    } | null = null;

    if (input.bookId) {
      const result = await queryWithContext<{
        title: string | null;
        pdf_url: string | null;
        original_file_url: string | null;
        page_text_content: {
          pages?: { pageNumber: number; text: string; wordCount?: number }[];
          totalWords?: number;
        } | null;
        text_extracted_at: string | null;
      }>(
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
        ? bookRecord.page_text_content
        : null;

    const pagesFromText =
      textContent?.pages?.map((page) => ({
        pageNumber: page.pageNumber,
        text: page.text,
        wordCount: page.wordCount ?? Math.max(1, page.text.split(/\s+/).length),
      })) ?? [];

    const previewPage =
      pagesFromText.length === 0 && input.textPreview
        ? [
            {
              pageNumber: 0,
              text: input.textPreview,
              wordCount: input.textPreview.split(/\s+/).length,
            },
          ]
        : [];

    const pdfUrl =
      input.pdfUrl ||
      bookRecord?.original_file_url ||
      bookRecord?.pdf_url ||
      undefined;

    if (pagesFromText.length === 0 && previewPage.length === 0 && !pdfUrl) {
      return {
        success: false,
        message:
          "No extracted text or file available for description generation",
      };
    }

    const aiResult = await AIService.generateDescription({
      title: input.title || bookRecord?.title || "Untitled",
      author: input.author,
      genre: input.genre,
      pages: pagesFromText.length ? pagesFromText : previewPage,
      totalWords: pagesFromText.length
        ? textContent?.totalWords
        : previewPage[0]?.wordCount,
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
  const user = await ensureLibrarianOrAdmin();

  const bookResult = await queryWithContext<{
    id: number;
    title: string | null;
    pdf_url: string | null;
    file_format: SupportedFileFormat | null;
    original_file_url: string | null;
    text_extraction_attempts: number | null;
  }>(
    user.userId,
    `SELECT id, title, pdf_url, file_format, original_file_url, text_extraction_attempts
     FROM books
     WHERE id = $1`,
    [bookId],
  );

  const book = bookResult.rows[0];
  if (!book) {
    return {
      success: false,
      message: "Book not found",
      errorType: "not_found" as const,
    };
  }

  const fileUrl = book.original_file_url || book.pdf_url;
  if (!fileUrl) {
    return {
      success: false,
      message: "Book has no file URL",
      errorType: "missing_file" as const,
    };
  }

  const fileFormat = book.file_format || "pdf";

  await queryWithContext(
    user.userId,
    `UPDATE books
     SET text_extraction_attempts = COALESCE(text_extraction_attempts, 0) + 1,
         last_extraction_attempt_at = NOW()
     WHERE id = $1`,
    [bookId],
  );

  try {
    let pdfUrlToExtract = fileUrl;

    if (["epub", "mobi", "azw", "azw3"].includes(fileFormat)) {
      const convertedPdfUrl = book.pdf_url;

      if (!convertedPdfUrl) {
        const errorMsg = `${fileFormat.toUpperCase()} file has not been converted to PDF yet. Please render the book first.`;

        await queryWithContext(
          user.userId,
          `UPDATE books
           SET text_extraction_error = $1,
               text_extraction_status = 'failed'
           WHERE id = $2`,
          [errorMsg, bookId],
        );

        return {
          success: false,
          message: errorMsg,
          errorType: "conversion_required" as const,
        };
      }

      pdfUrlToExtract = convertedPdfUrl;
    }

    const { extractTextFromPDF } = await import("@/lib/pdf-extractor");
    const textContent = await extractTextFromPDF(pdfUrlToExtract);

    if (textContent.totalWords < 10) {
      const errorMsg =
        "PDF appears to be image-based with no extractable text. Using image-based reader.";

      await queryWithContext(
        user.userId,
        `UPDATE books
         SET text_extraction_error = $1,
             text_extraction_status = 'failed',
             last_extraction_attempt_at = NOW()
         WHERE id = $2`,
        [errorMsg, bookId],
      );

      return {
        success: false,
        message: errorMsg,
        errorType: "insufficient_text" as const,
        totalWords: textContent.totalWords,
      };
    }

    const { saveTextToStorage } = await import("@/lib/text-storage");
    const textJsonUrl = await saveTextToStorage(bookId, {
      bookId,
      format: "pdf",
      extractedAt: new Date().toISOString(),
      totalPages: textContent.totalPages,
      totalWords: textContent.totalWords,
      pages: textContent.pages.map((page) => ({
        pageNumber: page.pageNumber,
        text: page.text,
        wordCount: page.wordCount,
      })),
      metadata: {
        extractionMethod: textContent.extractionMethod,
      },
    });

    await queryWithContext(
      user.userId,
      `UPDATE books
       SET page_text_content = $1,
           text_json_url = $2,
           text_extracted_at = NOW(),
           text_extraction_method = $3,
           text_extraction_status = 'completed',
           text_extraction_error = NULL
       WHERE id = $4`,
      [
        JSON.stringify({
          pages: textContent.pages,
          totalPages: textContent.totalPages,
          totalWords: textContent.totalWords,
          extractionMethod: textContent.extractionMethod,
        }),
        textJsonUrl,
        textContent.extractionMethod,
        bookId,
      ],
    );

    revalidateLibraryPaths(bookId);

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

    await queryWithContext(
      user.userId,
      `UPDATE books
       SET text_extraction_error = $1,
           text_extraction_status = 'failed',
           last_extraction_attempt_at = NOW()
       WHERE id = $2`,
      [errorMsg, bookId],
    );

    return {
      success: false,
      message: errorMsg,
      errorType: "extraction_error" as const,
      details: message,
    };
  }
};

export const convertEpubToImages = async (bookId: number) => {
  const user = await ensureLibrarianOrAdmin();

  const result = await queryWithContext<{
    id: number;
    title: string;
    file_format: string | null;
    original_file_url: string | null;
    pdf_url: string | null;
  }>(
    user.userId,
    `SELECT id, title, file_format, original_file_url, pdf_url
     FROM books
     WHERE id = $1`,
    [bookId],
  );

  const book = result.rows[0];
  if (!book) {
    return { success: false, message: "Book not found" };
  }

  if (book.file_format !== "epub") {
    return { success: false, message: "Book is not an EPUB file" };
  }

  const epubUrl = book.original_file_url || book.pdf_url;
  if (!epubUrl) {
    return { success: false, message: "EPUB file URL not found" };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/convert-epub`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, epubUrl }),
    });

    const resultJson = await response.json();

    if (!resultJson.success) {
      return {
        success: false,
        message: resultJson.error || "EPUB to PDF conversion failed",
      };
    }

    const renderResult = await renderBookImages(bookId);
    if (!renderResult.success) {
      return {
        success: false,
        message:
          renderResult.error || "PDF created but rendering failed unexpectedly",
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
  const user = await ensureLibrarianOrAdmin();

  const result = await queryWithContext<{
    id: number;
    title: string;
    file_format: string | null;
    original_file_url: string | null;
    pdf_url: string | null;
  }>(
    user.userId,
    `SELECT id, title, file_format, original_file_url, pdf_url
     FROM books
     WHERE id = $1`,
    [bookId],
  );

  const book = result.rows[0];
  if (!book) {
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

    const resultJson = await response.json();

    if (!resultJson.success) {
      return {
        success: false,
        message: resultJson.error || "MOBI/AZW to PDF conversion failed",
      };
    }

    const renderResult = await renderBookImages(bookId);
    if (!renderResult.success) {
      return {
        success: false,
        message:
          renderResult.error || "PDF created but rendering failed unexpectedly",
      };
    }

    const formatUpper = book.file_format?.toUpperCase() || "MOBI";

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

export const markBookAsReady = async (bookId: number, format: ReadyFormat) => {
  const user = await ensureLibrarianOrAdmin();

  let queryText: string;
  let params: Array<number | string>;

  switch (format) {
    case "epub":
      queryText = `
        UPDATE books
        SET text_extraction_status = 'completed',
            text_extracted_at = NOW(),
            text_extraction_method = 'native_epub',
            text_extraction_error = NULL
        WHERE id = $1
      `;
      params = [bookId];
      break;
    case "pdf_text":
      queryText = `
        UPDATE books
        SET text_extraction_status = 'completed',
            text_extraction_error = NULL
        WHERE id = $1
      `;
      params = [bookId];
      break;
    case "pdf_images":
      queryText = `
        UPDATE books
        SET text_extraction_status = 'image_fallback',
            text_extraction_error = 'Scanned PDF - using image-based reader'
        WHERE id = $1
      `;
      params = [bookId];
      break;
    default:
      throw new Error(`Unknown format: ${format}`);
  }

  await queryWithContext(user.userId, queryText, params);

  revalidateLibraryPaths(bookId);

  return { success: true };
};
