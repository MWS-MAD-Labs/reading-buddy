"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roleCheck";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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
  const supabase = getSupabaseAdminClient();

  // Default to current user as teacher
  // If admin provides a specific teacherId, use that, otherwise use current user
  const teacher_id = input.teacherId || user.id;

  const { error } = await supabase.from("classes").insert({
    name: input.name,
    teacher_id,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/teacher/classrooms");
};

export const deleteClassroom = async (classId: number) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const supabase = getSupabaseAdminClient();

  await assertCanManageClass(classId, user.id, role);

  const { error } = await supabase.from("classes").delete().eq("id", classId);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/teacher/classrooms");
};

export const addStudentToClass = async (input: {
  classId: number;
  studentId: string;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const supabase = getSupabaseAdminClient();

  await assertCanManageClass(input.classId, user.id, role);

  const { error } = await supabase.from("class_students").insert({
    class_id: input.classId,
    student_id: input.studentId,
  });

  if (error) {
    throw error;
  }

  revalidateClassroom(input.classId);
};

export const removeStudentFromClass = async (input: {
  classId: number;
  studentId: string;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const supabase = getSupabaseAdminClient();

  await assertCanManageClass(input.classId, user.id, role);

  const { error } = await supabase
    .from("class_students")
    .delete()
    .eq("class_id", input.classId)
    .eq("student_id", input.studentId);

  if (error) {
    throw error;
  }

  revalidateClassroom(input.classId);
};

export const assignBookToClass = async (input: {
  classId: number;
  bookId: number;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const supabase = getSupabaseAdminClient();

  await assertCanManageClass(input.classId, user.id, role);

  const { error } = await supabase
    .from("class_books")
    .upsert(
      { class_id: input.classId, book_id: input.bookId },
      { onConflict: "class_id,book_id" },
    );

  if (error) {
    throw error;
  }

  revalidateClassroom(input.classId);
};

export const removeBookFromClass = async (input: {
  classId: number;
  bookId: number;
}) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const supabase = getSupabaseAdminClient();

  await assertCanManageClass(input.classId, user.id, role);

  const { error } = await supabase
    .from("class_books")
    .delete()
    .eq("class_id", input.classId)
    .eq("book_id", input.bookId);

  if (error) {
    throw error;
  }

  revalidateClassroom(input.classId);
};

// =============================================
// Quiz Assignment Actions
// =============================================

export const getPublishedQuizzesByBook = async (bookId: number) => {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("quizzes")
    .select(
      "id, quiz_type, status, is_published, created_at, page_range_start, page_range_end, checkpoint_page, questions",
    )
    .eq("book_id", bookId)
    .eq("is_published", true)
    .eq("quiz_type", "classroom") // Only classroom quizzes can be assigned by teachers
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((quiz) => ({
    id: quiz.id,
    quiz_type: quiz.quiz_type,
    status: quiz.status,
    is_published: quiz.is_published,
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
  const supabase = getSupabaseAdminClient();

  await assertCanManageClass(input.classId, user.id, role);

  // Check if quiz is published
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("is_published, quiz_type")
    .eq("id", input.quizId)
    .single();

  if (quizError) {
    throw new Error("Quiz not found");
  }

  if (!quiz.is_published) {
    throw new Error("Only published quizzes can be assigned");
  }

  if (quiz.quiz_type !== "classroom") {
    throw new Error("Only classroom quizzes can be assigned to classes");
  }

  const { error } = await supabase.from("class_quiz_assignments").insert({
    class_id: input.classId,
    quiz_id: input.quizId,
    assigned_by: user.id,
    due_date: input.dueDate || null,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      // Unique constraint violation
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
  const supabase = getSupabaseAdminClient();

  await assertCanManageClass(input.classId, user.id, role);

  const { error } = await supabase
    .from("class_quiz_assignments")
    .delete()
    .eq("class_id", input.classId)
    .eq("quiz_id", input.quizId);

  if (error) {
    throw error;
  }

  revalidateClassroom(input.classId);
  revalidatePath("/dashboard/teacher/books");
};

export const getClassQuizAssignments = async (classId: number) => {
  const { user, role } = await requireRole(["TEACHER", "ADMIN"]);
  const supabase = getSupabaseAdminClient();

  await assertCanManageClass(classId, user.id, role);

  // Query the assignments with related data
  const { data: assignments, error } = await supabase
    .from("class_quiz_assignments")
    .select(
      `
      id,
      class_id,
      quiz_id,
      assigned_at,
      due_date,
      is_active,
      quizzes (
        quiz_type,
        book_id,
        questions
      )
    `,
    )
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("Error fetching quiz assignments:", error);
    throw error;
  }

  // Get student count for this class
  const { count: studentCount } = await supabase
    .from("class_students")
    .select("*", { count: "exact", head: true })
    .eq("class_id", classId);

  // Transform and enrich the data
  const enrichedAssignments = await Promise.all(
    (assignments || []).map(async (assignment: any) => {
      const quiz = Array.isArray(assignment.quizzes)
        ? assignment.quizzes[0]
        : assignment.quizzes;

      // Get attempt counts for this quiz
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("id, student_id, score")
        .eq("quiz_id", assignment.quiz_id);

      const attemptCount = attempts?.length || 0;
      const completedCount = new Set(
        attempts?.filter((a) => a.score !== null).map((a) => a.student_id) ||
          [],
      ).size;

      return {
        assignment_id: assignment.id,
        class_id: assignment.class_id,
        quiz_id: assignment.quiz_id,
        quiz_type: quiz?.quiz_type || "classroom",
        book_id: quiz?.book_id || 0,
        question_count: Array.isArray(quiz?.questions)
          ? quiz.questions.length
          : 0,
        assigned_at: assignment.assigned_at,
        due_date: assignment.due_date,
        is_active: assignment.is_active,
        attempt_count: attemptCount,
        completed_count: completedCount,
        total_students: studentCount || 0,
      };
    }),
  );

  return enrichedAssignments;
};
