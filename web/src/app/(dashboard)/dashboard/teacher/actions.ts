"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roleCheck";
import { getCurrentUser } from "@/lib/auth/server";
import { query, queryWithContext } from "@/lib/db";
import { assertCanManageClass } from "@/lib/classrooms/permissions";
import { AIService } from "@/lib/ai";
import { checkRateLimit } from "@/lib/middleware/withRateLimit";

const revalidateClassroom = (classId: number) => {
  revalidatePath("/dashboard/teacher");
  revalidatePath(`/dashboard/teacher/classrooms/${classId}`);
};

export const createClassroom = async (input: {
  name: string;
  teacherId?: string | null;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  // Default to current user's profileId as teacher
  // If admin provides a specific teacherId (profileId), use that
  const teacher_id = input.teacherId || user.profileId;

  await queryWithContext(
    userId,
    `INSERT INTO classes (name, teacher_id) VALUES ($1, $2)`,
    [input.name, teacher_id],
  );

  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/teacher/classrooms");
};

export const deleteClassroom = async (classId: number) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  await assertCanManageClass(classId, user.profileId!, role);

  await queryWithContext(userId, `DELETE FROM classes WHERE id = $1`, [
    classId,
  ]);

  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/teacher/classrooms");
};

export const addStudentToClass = async (input: {
  classId: number;
  studentId: string;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  await assertCanManageClass(input.classId, user.profileId!, role);

  await queryWithContext(
    userId,
    `INSERT INTO class_students (class_id, student_id) VALUES ($1, $2)`,
    [input.classId, input.studentId],
  );

  revalidateClassroom(input.classId);
};

export const removeStudentFromClass = async (input: {
  classId: number;
  studentId: string;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  await assertCanManageClass(input.classId, user.profileId!, role);

  await queryWithContext(
    userId,
    `DELETE FROM class_students WHERE class_id = $1 AND student_id = $2`,
    [input.classId, input.studentId],
  );

  revalidateClassroom(input.classId);
};

export const assignBookToClass = async (input: {
  classId: number;
  bookId: number;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  await assertCanManageClass(input.classId, user.profileId!, role);

  await queryWithContext(
    userId,
    `INSERT INTO class_books (class_id, book_id)
     VALUES ($1, $2)
     ON CONFLICT (class_id, book_id) DO NOTHING`,
    [input.classId, input.bookId],
  );

  revalidateClassroom(input.classId);
};

export const removeBookFromClass = async (input: {
  classId: number;
  bookId: number;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  await assertCanManageClass(input.classId, user.profileId!, role);

  await queryWithContext(
    userId,
    `DELETE FROM class_books WHERE class_id = $1 AND book_id = $2`,
    [input.classId, input.bookId],
  );

  revalidateClassroom(input.classId);
};

// =============================================
// Quiz Assignment Actions
// =============================================

export const getPublishedQuizzesByBook = async (bookId: number) => {
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  const result = await queryWithContext(
    userId,
    `SELECT
      id, quiz_type, checkpoint_page,
      page_range_start, page_range_end,
      questions, created_at
     FROM quizzes
     WHERE book_id = $1
       AND quiz_type = 'classroom'
     ORDER BY created_at DESC`,
    [bookId],
  );

  return result.rows.map((quiz: any) => ({
    id: quiz.id,
    quiz_type: quiz.quiz_type,
    status: "published",
    is_published: true,
    created_at: quiz.created_at,
    page_range_start: quiz.page_range_start,
    page_range_end: quiz.page_range_end,
    checkpoint_page: quiz.checkpoint_page,
    question_count: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
  }));
};

export const assignQuizToClass = async (input: {
  classId: number;
  quizId: number;
  dueDate?: string;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  await assertCanManageClass(input.classId, user.profileId!, role);

  // Check if quiz exists and is classroom type
  const quizResult = await queryWithContext(
    userId,
    `SELECT quiz_type FROM quizzes WHERE id = $1`,
    [input.quizId],
  );

  if (quizResult.rows.length === 0) {
    throw new Error("Quiz not found");
  }

  if (quizResult.rows[0].quiz_type !== "classroom") {
    throw new Error("Only classroom quizzes can be assigned to classes");
  }

  try {
    await queryWithContext(
      userId,
      `INSERT INTO class_quiz_assignments (class_id, quiz_id, assigned_by, due_date, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [input.classId, input.quizId, user.profileId, input.dueDate || null],
    );
  } catch (error: any) {
    if (error.code === "23505") {
      throw new Error("This quiz is already assigned to this class");
    }
    throw error;
  }

  revalidateClassroom(input.classId);
  revalidatePath("/dashboard/teacher/books");
};

export const unassignQuizFromClass = async (input: {
  classId: number;
  quizId: number;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  await assertCanManageClass(input.classId, user.profileId!, role);

  await queryWithContext(
    userId,
    `DELETE FROM class_quiz_assignments
     WHERE class_id = $1 AND quiz_id = $2`,
    [input.classId, input.quizId],
  );

  revalidateClassroom(input.classId);
  revalidatePath("/dashboard/teacher/books");
};

export const getClassQuizAssignments = async (classId: number) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  await assertCanManageClass(classId, user.profileId!, role);

  // Get quiz assignments with related data
  const result = await queryWithContext(
    userId,
    `
    WITH assignment_data AS (
      SELECT
        cqa.id,
        cqa.class_id,
        cqa.quiz_id,
        cqa.assigned_at,
        cqa.due_date,
        cqa.is_active,
        q.quiz_type,
        q.book_id,
        q.questions,
        (SELECT COUNT(*) FROM class_students WHERE class_id = cqa.class_id) as student_count
      FROM class_quiz_assignments cqa
      JOIN quizzes q ON cqa.quiz_id = q.id
      WHERE cqa.class_id = $1 AND cqa.is_active = true
      ORDER BY cqa.assigned_at DESC
    ),
    attempt_stats AS (
      SELECT
        ad.id,
        ad.quiz_id,
        COUNT(qa.id) as attempt_count,
        COUNT(DISTINCT CASE WHEN qa.score IS NOT NULL THEN qa.student_id END) as completed_count
      FROM assignment_data ad
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = ad.quiz_id
      GROUP BY ad.id, ad.quiz_id
    )
    SELECT
      ad.id as assignment_id,
      ad.class_id,
      ad.quiz_id,
      ad.quiz_type,
      ad.book_id,
      ad.questions,
      ad.assigned_at,
      ad.due_date,
      ad.is_active,
      ad.student_count as total_students,
      COALESCE(ats.attempt_count, 0) as attempt_count,
      COALESCE(ats.completed_count, 0) as completed_count
    FROM assignment_data ad
    LEFT JOIN attempt_stats ats ON ats.id = ad.id
    `,
    [classId],
  );

  return result.rows.map((row: any) => ({
    assignment_id: row.assignment_id,
    class_id: row.class_id,
    quiz_id: row.quiz_id,
    quiz_type: row.quiz_type || "classroom",
    book_id: row.book_id || 0,
    question_count: Array.isArray(row.questions) ? row.questions.length : 0,
    assigned_at: row.assigned_at,
    due_date: row.due_date,
    is_active: row.is_active,
    attempt_count: parseInt(row.attempt_count || "0"),
    completed_count: parseInt(row.completed_count || "0"),
    total_students: parseInt(row.total_students || "0"),
  }));
};

// =============================================
// Teacher Quiz Generation Actions
// =============================================

export const getBookDetailsForQuiz = async (bookId: number) => {
  await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  const result = await queryWithContext(
    userId,
    `SELECT id, title, page_count, text_extracted_at, page_text_content
     FROM books WHERE id = $1`,
    [bookId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const book = result.rows[0];
  return {
    id: book.id,
    title: book.title,
    pageCount: book.page_count,
    hasExtractedText: !!book.text_extracted_at && !!book.page_text_content,
  };
};

export const generateQuizForBookAsTeacher = async (input: {
  classId: number;
  bookId: number;
  quizType: "checkpoint" | "classroom";
  pageRangeStart?: number;
  pageRangeEnd?: number;
  checkpointPage?: number;
  questionCount?: number;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const currentUser = await getCurrentUser();
  const userId = currentUser.userId!;

  // Verify teacher has access to this class
  await assertCanManageClass(input.classId, user.profileId!, role);

  // Verify the book is assigned to this class
  const bookAssignment = await queryWithContext(
    userId,
    `SELECT 1 FROM class_books WHERE class_id = $1 AND book_id = $2`,
    [input.classId, input.bookId]
  );

  if (bookAssignment.rows.length === 0) {
    throw new Error("This book is not assigned to your class.");
  }

  // Rate limiting: 10 requests per hour per user
  const rateLimitCheck = await checkRateLimit(
    `user:${userId}`,
    "quizGeneration"
  );
  if (rateLimitCheck.exceeded) {
    const resetTime = rateLimitCheck.reset
      ? new Date(rateLimitCheck.reset).toLocaleTimeString()
      : "soon";
    throw new Error(`Rate limit exceeded. Please try again at ${resetTime}.`);
  }

  // Validate checkpoint input
  if (input.quizType === "checkpoint" && !input.checkpointPage) {
    throw new Error("Checkpoint page is required for checkpoint quizzes.");
  }

  // Fetch book data including extracted text
  const bookResult = await queryWithContext(
    userId,
    `SELECT id, title, author, genre, description, page_count, page_text_content, text_extracted_at, pdf_url, original_file_url
     FROM books WHERE id = $1`,
    [input.bookId]
  );

  if (bookResult.rows.length === 0) {
    throw new Error("Book not found.");
  }

  const book = bookResult.rows[0];

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
      (p) => p.pageNumber >= startPage && p.pageNumber <= endPage
    );

    const filteredPages = pagesInRange.filter(
      (page) => page.text && page.text.trim().length > 0
    );

    if (filteredPages.length) {
      pagesPayload = filteredPages;
      totalWords =
        filteredPages.reduce(
          (sum, page) =>
            sum + (page.wordCount ?? page.text.split(/\s+/).length),
          0
        ) || textContent.totalWords;
      contentSource = `pages ${startPage}-${endPage}`;
    }
  }

  if (!pagesPayload) {
    const fallbackText = book.description || "";
    if (!fallbackText) {
      throw new Error(
        "No book content available. Please ask a librarian to extract text from the book first."
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

  // Generate quiz using AI
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

  // Save the quiz to database - teacher-created quizzes are auto-published as 'classroom' type
  const quizResult = await queryWithContext(
    userId,
    `INSERT INTO quizzes (
      book_id, created_by_id, questions, quiz_type,
      page_range_start, page_range_end, checkpoint_page, status, is_published
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', true)
    RETURNING id`,
    [
      book.id,
      user.profileId,
      JSON.stringify(quizPayload),
      input.quizType,
      input.pageRangeStart ?? null,
      input.pageRangeEnd ?? null,
      input.checkpointPage ?? null,
    ]
  );

  if (quizResult.rows.length === 0) {
    throw new Error("Failed to save quiz.");
  }

  const inserted = quizResult.rows[0];

  // Auto-assign the quiz to the class
  await queryWithContext(
    userId,
    `INSERT INTO class_quiz_assignments (class_id, quiz_id, assigned_by, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (class_id, quiz_id) DO NOTHING`,
    [input.classId, inserted.id, user.profileId]
  );

  revalidateClassroom(input.classId);
  revalidatePath("/dashboard/library");

  return {
    quizId: inserted.id,
    questionCount: quizPayload.questions.length,
    contentSource,
  };
};
