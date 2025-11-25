"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getMinioBucketName, getMinioClient } from "@/lib/minio";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export const checkCurrentUserRole = async () => {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in" };
  }

  // Query without .single() first to check for duplicates
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id);

  const hasDuplicates = profiles && profiles.length > 1;
  const profile = profiles?.[0]; // Take the first one if multiple exist

  return {
    userId: user.id,
    email: user.email,
    profile,
    profileError: profileError ? profileError.message : null,
    hasDuplicates,
    profileCount: profiles?.length || 0,
  };
};

const ensureLibrarianOrAdmin = async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to manage books.");
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id);

  if (profileError) {
    throw new Error(
      `Profile query failed: ${profileError.message}. Please contact admin.`,
    );
  }

  if (!profiles || profiles.length === 0) {
    throw new Error(
      "No profile found for your account. Please contact admin to set up your profile.",
    );
  }

  if (profiles.length > 1) {
    console.warn(
      `Warning: User ${user.id} has ${profiles.length} duplicate profiles. Using the first one.`,
    );
  }

  const profile = profiles[0];

  if (!profile || !["LIBRARIAN", "ADMIN"].includes(profile.role)) {
    throw new Error(
      `Insufficient permissions. Your current role is: ${profile?.role || "unknown"}. Only LIBRARIAN or ADMIN users can manage books.`,
    );
  }
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
  await ensureLibrarianOrAdmin();

  if (!input.accessLevels?.length) {
    throw new Error("At least one access level is required.");
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const { data: insertedBook, error } = await supabaseAdmin
    .from("books")
    .insert({
      isbn: input.isbn,
      title: input.title,
      author: input.author,
      publisher: input.publisher,
      publication_year: input.publicationYear,
      genre: input.genre,
      language: input.language,
      description: input.description,
      page_count: input.pageCount,
      pdf_url: input.pdfUrl,
      cover_url: input.coverUrl,
      file_format: input.fileFormat || "pdf",
      original_file_url: input.pdfUrl,
      file_size_bytes: input.fileSizeBytes,
    })
    .select("id")
    .single();

  if (error || !insertedBook) {
    console.error("Book insert error:", error);
    throw error ?? new Error("Unable to insert book.");
  }

  const { error: accessInsertError } = await supabaseAdmin
    .from("book_access")
    .insert(
      input.accessLevels.map((level) => ({
        book_id: insertedBook.id,
        access_level: level,
      })),
    );

  if (accessInsertError) {
    console.error("Book access insert error:", accessInsertError);
    throw accessInsertError;
  }

  const { error: jobInsertError } = await supabaseAdmin
    .from("book_render_jobs")
    .insert({
      book_id: insertedBook.id,
      status: "pending",
    });

  if (jobInsertError) {
    console.error("Unable to queue render job:", jobInsertError.message);
  }

  revalidatePath("/dashboard/library");
  revalidatePath("/dashboard/librarian");

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
  pdfUrl?: string;
  coverUrl?: string;
  pageCount?: number | null;
}) => {
  await ensureLibrarianOrAdmin();

  const supabaseAdmin = getSupabaseAdminClient();

  const updateData: Record<string, unknown> = {
    isbn: input.isbn,
    title: input.title,
    author: input.author,
    publisher: input.publisher,
    publication_year: input.publicationYear,
    genre: input.genre,
    language: input.language,
    description: input.description ?? null,
  };

  // Add optional fields if provided
  if (input.pdfUrl !== undefined) {
    updateData.pdf_url = input.pdfUrl;
  }
  if (input.coverUrl !== undefined) {
    updateData.cover_url = input.coverUrl;
  }
  if (input.pageCount !== undefined) {
    updateData.page_count = input.pageCount;
  }

  const { error } = await supabaseAdmin
    .from("books")
    .update(updateData)
    .eq("id", input.id);

  if (error) {
    console.error("Book update error:", error);
    throw error;
  }

  if (!input.accessLevels?.length) {
    throw new Error("At least one access level is required.");
  }

  const { error: deleteAccessError } = await supabaseAdmin
    .from("book_access")
    .delete()
    .eq("book_id", input.id);
  if (deleteAccessError) {
    console.error("Book access delete error:", deleteAccessError);
    throw deleteAccessError;
  }

  const { error: insertAccessError } = await supabaseAdmin
    .from("book_access")
    .insert(
      input.accessLevels.map((level) => ({
        book_id: input.id,
        access_level: level,
      })),
    );

  if (insertAccessError) {
    console.error("Book access insert error:", insertAccessError);
    throw insertAccessError;
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
    .select("id, title, description")
    .eq("id", input.bookId)
    .single();

  if (bookError || !book) {
    throw new Error("Book not found.");
  }

  if (!book.description) {
    throw new Error("Add a summary/description before generating a quiz.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const prompt = `
    You are an assistant who writes engaging multiple-choice quizzes for students aged 10-16.
    Based on the following book summary, write 5 multiple-choice questions.
    Each question must contain 4 answer options and a correct answer index.

    Return JSON with this shape:
    {
      "title": "${book.title} Quiz",
      "questions": [
        {
          "question": "string",
          "options": ["A", "B", "C", "D"],
          "answerIndex": 1,
          "explanation": "Optional explanation"
        }
      ]
    }

    Summary:
    """${book.description}"""
  `;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("Gemini did not return any content.");
  }

  let quizPayload: unknown;
  try {
    quizPayload = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Gemini returned invalid JSON: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

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

  // Validate input
  if (input.quizType === "checkpoint" && !input.checkpointPage) {
    throw new Error("Checkpoint page is required for checkpoint quizzes.");
  }

  // Fetch book data including extracted text
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select(
      "id, title, author, genre, description, page_count, page_text_content, text_extracted_at",
    )
    .eq("id", input.bookId)
    .single();

  if (bookError || !book) {
    throw new Error("Book not found.");
  }

  // Check if text has been extracted
  const hasExtractedText = book.text_extracted_at && book.page_text_content;

  let bookContent = "";
  let contentSource = "description";

  if (hasExtractedText && book.page_text_content) {
    const textContent = book.page_text_content as {
      pages: { pageNumber: number; text: string; wordCount: number }[];
      totalPages: number;
      totalWords: number;
    };

    // Extract text from specified page range or full book
    const startPage = input.pageRangeStart ?? 1;
    const endPage = input.pageRangeEnd ?? textContent.totalPages;

    const pagesInRange = textContent.pages.filter(
      (p) => p.pageNumber >= startPage && p.pageNumber <= endPage,
    );

    bookContent = pagesInRange
      .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
      .join("\n\n");

    contentSource = `pages ${startPage}-${endPage}`;

    // Fallback to description if no text content in range
    if (!bookContent.trim() || bookContent.split(" ").length < 50) {
      bookContent = book.description || "";
      contentSource = "description (fallback - insufficient text extracted)";
    }
  } else {
    // Use description if no extracted text
    bookContent = book.description || "";
    if (!bookContent) {
      throw new Error(
        "No book content available. Please add a description or extract text from the PDF.",
      );
    }
  }

  // Determine question count
  const questionCount = input.questionCount ?? 5;

  // Generate quiz with Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });

  const quizTypeDescription =
    input.quizType === "checkpoint"
      ? `a checkpoint quiz that students must complete while reading`
      : `a classroom quiz for assessment`;

  const pageRangeInfo =
    input.pageRangeStart && input.pageRangeEnd
      ? `Content: Pages ${input.pageRangeStart}-${input.pageRangeEnd}`
      : "Content: Full book";

  const prompt = `
You are an educational assistant creating ${quizTypeDescription} for students aged 10-16.

Book: "${book.title}" by ${book.author}
${pageRangeInfo}
Genre: ${book.genre || "General"}

Below is the actual content from the book:
"""
${bookContent}
"""

Generate ${questionCount} multiple-choice questions that:
1. Test comprehension of key concepts and plot points from the provided content
2. Are appropriate for the target age group (10-16 years old)
3. Include varied difficulty levels (mix of easy, medium, and hard)
4. Focus on important themes, character development, and story elements
5. Have clear, unambiguous correct answers

Return JSON with this exact structure:
{
  "title": "${book.title} Quiz - ${contentSource}",
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answerIndex": 0,
      "difficulty": "easy|medium|hard",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}

Important: answerIndex should be 0-3 (zero-based index of the correct option).
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error("Gemini did not return any content.");
  }

  let quizPayload: unknown;
  try {
    quizPayload = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Gemini returned invalid JSON: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  // Save quiz to database
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

  // If this is a checkpoint quiz, create the checkpoint record
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
    questionCount,
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
  const { suggestCheckpoints, suggestQuestionCount } = await import(
    "@/lib/pdf-extractor"
  );

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

  const supabase = getSupabaseAdminClient();

  // Check if book exists
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, title")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    return { error: "Book not found" };
  }

  // Create or update render job
  const { data: existingJob } = await supabase
    .from("book_render_jobs")
    .select("id, status")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let jobId: number;

  if (existingJob && existingJob.status === "pending") {
    jobId = existingJob.id;
  } else {
    const { data: newJob, error: jobError } = await supabase
      .from("book_render_jobs")
      .insert({ book_id: bookId, status: "pending" })
      .select("id")
      .single();

    if (jobError || !newJob) {
      return { error: "Failed to create render job" };
    }

    jobId = newJob.id;
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

  const supabase = getSupabaseAdminClient();

  // Check book's page_images_count
  const { data: book } = await supabase
    .from("books")
    .select("page_images_count, page_images_rendered_at")
    .eq("id", bookId)
    .single();

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

export const generateBookDescription = async (input: {
  title: string;
  author: string;
  genre?: string;
  pageCount?: number;
  textPreview?: string;
}) => {
  "use server";

  await ensureLibrarianOrAdmin();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, message: "Gemini API key not configured" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Generate a compelling and intriguing book description for the following book:

Title: ${input.title}
Author: ${input.author}
${input.genre ? `Genre: ${input.genre}` : ""}
${input.pageCount ? `Page Count: ${input.pageCount}` : ""}
${input.textPreview ? `\nText Preview (first 500 words):\n${input.textPreview}` : ""}

Please write a SHORT, punchy description that:
1. Hooks readers with an intriguing opening line
2. Creates mystery or excitement without revealing too much
3. Is appropriate for a library catalog
4. Avoids spoilers but teases the story
5. Is MAXIMUM 50 words (approximately 250-300 characters)
6. Uses vivid, engaging language that makes people want to read the book

IMPORTANT: Keep it under 50 words. Be concise and impactful.
Write in an exciting, cinematic style. Think movie trailer tagline, not full summary.

Return ONLY the description text, without any preamble or additional commentary.`;

    const result = await model.generateContent(prompt);
    const description = result.response.text().trim();

    return {
      success: true,
      description,
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
    .select("id, title, pdf_url, file_format, original_file_url")
    .eq("id", bookId)
    .single();

  if (bookError || !book) {
    return { success: false, message: "Book not found" };
  }

  const fileUrl = book.original_file_url || book.pdf_url;
  if (!fileUrl) {
    return { success: false, message: "Book has no file URL" };
  }

  const fileFormat = book.file_format || "pdf";

  try {
    let textContent;
    let pdfUrlToExtract = fileUrl;

    // For EPUB and MOBI/AZW files, we need to use the converted PDF
    if (["epub", "mobi", "azw", "azw3"].includes(fileFormat)) {
      // Get the converted PDF URL from the book record
      const convertedPdfUrl = book.pdf_url;

      if (!convertedPdfUrl) {
        return {
          success: false,
          message: `${fileFormat.toUpperCase()} file has not been converted to PDF yet. Please render the book first.`,
        };
      }

      pdfUrlToExtract = convertedPdfUrl;
    }

    // Extract text from PDF (either original PDF or converted from EPUB/MOBI/AZW)
    const { extractTextFromPDF } = await import("@/lib/pdf-extractor");
    textContent = await extractTextFromPDF(pdfUrlToExtract);

    // Save to database
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
      })
      .eq("id", bookId);

    if (updateError) {
      return { success: false, message: updateError.message };
    }

    return {
      success: true,
      message: `Text extracted: ${textContent.totalPages} pages, ${textContent.totalWords} words`,
      totalPages: textContent.totalPages,
      totalWords: textContent.totalWords,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Text extraction failed: ${message}` };
  }
};

export const convertEpubToImages = async (bookId: number) => {
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
