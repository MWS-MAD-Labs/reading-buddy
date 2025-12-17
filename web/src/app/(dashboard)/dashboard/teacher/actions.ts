"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roleCheck";
import { getCurrentUser } from "@/lib/auth/server";
import { queryWithContext } from "@/lib/db";
import { assertCanManageClass } from "@/lib/classrooms/permissions";

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

  return result.rows.map((quiz) => ({
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

  return result.rows.map((row) => ({
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
