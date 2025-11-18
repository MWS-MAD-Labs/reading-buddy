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
