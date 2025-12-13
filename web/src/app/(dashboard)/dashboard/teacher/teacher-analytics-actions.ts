"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type ClassAnalytics = {
  classId: number;
  className: string;
  totalStudents: number;
  activeStudents: number; // Students who read in last 7 days
  averageXP: number;
  totalBooksRead: number;
  totalPagesRead: number;
  averageLevel: number;
  quizCompletionRate: number; // Percentage of students who completed quizzes
};

export type StudentPerformance = {
  studentId: string;
  studentName: string;
  xp: number;
  level: number;
  booksCompleted: number;
  pagesRead: number;
  quizzesCompleted: number;
  readingStreak: number;
  lastReadDate: string | null;
};

export type BookAssignment = {
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string;
  assignedClasses: string[]; // Class names
  totalStudents: number;
  studentsStarted: number;
  studentsCompleted: number;
  averageProgress: number; // Average percentage completed
  completionRate: number; // Percentage of students who completed
};

export type QuizAssignment = {
  quizId: number;
  quizTitle: string;
  bookTitle: string;
  assignedClasses: string[];
  totalStudents: number;
  studentsAttempted: number;
  averageScore: number;
  passRate: number; // Percentage of students who scored >= 70%
};

/**
 * Get analytics overview for all teacher's classes
 */
export async function getTeacherClassAnalytics(
  teacherId: string,
): Promise<ClassAnalytics[]> {
  const supabase = getSupabaseAdminClient();

  // Get all classes for this teacher
  const { data: classes, error: classesError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", teacherId);

  if (classesError || !classes) {
    console.error("Error fetching classes:", classesError);
    return [];
  }

  // Get analytics for each class
  const analytics = await Promise.all(
    classes.map(async (classroom) => {
      // Get all students in this class
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", classroom.id);

      const studentIds = classStudents?.map((cs) => cs.student_id) ?? [];

      if (studentIds.length === 0) {
        return {
          classId: classroom.id,
          className: classroom.name,
          totalStudents: 0,
          activeStudents: 0,
          averageXP: 0,
          totalBooksRead: 0,
          totalPagesRead: 0,
          averageLevel: 0,
          quizCompletionRate: 0,
        };
      }

      // Get student profiles with gamification data
      const { data: profiles } = await supabase
        .from("profiles")
        .select(
          "xp, level, total_books_completed, total_pages_read, last_read_date",
        )
        .in("id", studentIds);

      // Get quiz attempts for completion rate
      const { data: quizAttempts } = await supabase
        .from("quiz_attempts")
        .select("student_id")
        .in("student_id", studentIds);

      const studentsWithQuizzes = new Set(
        quizAttempts?.map((qa) => qa.student_id) ?? [],
      );

      // Calculate active students (read in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const activeStudents =
        profiles?.filter((p) => {
          if (!p.last_read_date) return false;
          return new Date(p.last_read_date) >= sevenDaysAgo;
        }).length ?? 0;

      // Calculate averages
      const totalXP = profiles?.reduce((sum, p) => sum + (p.xp ?? 0), 0) ?? 0;
      const totalLevel =
        profiles?.reduce((sum, p) => sum + (p.level ?? 1), 0) ?? 0;
      const totalBooks =
        profiles?.reduce((sum, p) => sum + (p.total_books_completed ?? 0), 0) ??
        0;
      const totalPages =
        profiles?.reduce((sum, p) => sum + (p.total_pages_read ?? 0), 0) ?? 0;

      const studentCount = studentIds.length;

      return {
        classId: classroom.id,
        className: classroom.name,
        totalStudents: studentCount,
        activeStudents,
        averageXP: Math.round(totalXP / studentCount),
        totalBooksRead: totalBooks,
        totalPagesRead: totalPages,
        averageLevel: Math.round(totalLevel / studentCount),
        quizCompletionRate: Math.round(
          (studentsWithQuizzes.size / studentCount) * 100,
        ),
      };
    }),
  );

  return analytics;
}

/**
 * Get detailed student performance for a specific class
 */
export async function getClassStudentPerformance(
  classId: number,
): Promise<StudentPerformance[]> {
  const supabase = getSupabaseAdminClient();

  // Get all students in this class
  const { data: classStudents } = await supabase
    .from("class_students")
    .select("student_id")
    .eq("class_id", classId);

  const studentIds = classStudents?.map((cs) => cs.student_id) ?? [];

  if (studentIds.length === 0) {
    return [];
  }

  // Get student profiles with gamification data
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, full_name, xp, level, total_books_completed, total_pages_read, total_quizzes_completed, reading_streak, last_read_date",
    )
    .in("id", studentIds);

  if (!profiles) {
    return [];
  }

  return profiles.map((profile) => ({
    studentId: profile.id,
    studentName: profile.full_name ?? "Unknown Student",
    xp: profile.xp ?? 0,
    level: profile.level ?? 1,
    booksCompleted: profile.total_books_completed ?? 0,
    pagesRead: profile.total_pages_read ?? 0,
    quizzesCompleted: profile.total_quizzes_completed ?? 0,
    readingStreak: profile.reading_streak ?? 0,
    lastReadDate: profile.last_read_date,
  }));
}

/**
 * Get book assignments for teacher's classes
 */
export async function getTeacherBookAssignments(
  teacherId: string,
): Promise<BookAssignment[]> {
  const supabase = getSupabaseAdminClient();

  // Get all classes for this teacher
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", teacherId);

  if (!classes || classes.length === 0) {
    return [];
  }

  const classIds = classes.map((c) => c.id);

  // Get all books assigned to these classes
  const { data: classBooks } = await supabase
    .from("class_books")
    .select(
      "book_id, class_id, books(id, title, author, cover_url, page_count)",
    )
    .in("class_id", classIds);

  if (!classBooks || classBooks.length === 0) {
    return [];
  }

  // Group by book
  const bookMap = new Map<number, { book: any; classIds: number[] }>();

  classBooks.forEach((cb) => {
    const bookData = Array.isArray(cb.books) ? cb.books[0] : cb.books;
    if (!bookData) return;

    if (!bookMap.has(cb.book_id)) {
      bookMap.set(cb.book_id, {
        book: bookData,
        classIds: [cb.class_id],
      });
    } else {
      bookMap.get(cb.book_id)!.classIds.push(cb.class_id);
    }
  });

  // Calculate statistics for each book
  const assignments = await Promise.all(
    Array.from(bookMap.entries()).map(
      async ([bookId, { book, classIds: assignedClassIds }]) => {
        // Get all students in these classes
        const { data: classStudents } = await supabase
          .from("class_students")
          .select("student_id")
          .in("class_id", assignedClassIds);

        const studentIds = [
          ...new Set(classStudents?.map((cs) => cs.student_id) ?? []),
        ];
        const totalStudents = studentIds.length;

        if (totalStudents === 0) {
          return {
            bookId,
            bookTitle: book.title,
            bookAuthor: book.author ?? "Unknown",
            bookCoverUrl: book.cover_url,
            assignedClasses: classes
              .filter((c) => assignedClassIds.includes(c.id))
              .map((c) => c.name),
            totalStudents: 0,
            studentsStarted: 0,
            studentsCompleted: 0,
            averageProgress: 0,
            completionRate: 0,
          };
        }

        // Get student progress
        const { data: studentBooks } = await supabase
          .from("student_books")
          .select("student_id, current_page, completed_at")
          .eq("book_id", bookId)
          .in("student_id", studentIds);

        const studentsStarted = studentBooks?.length ?? 0;
        const studentsCompleted =
          studentBooks?.filter((sb) => sb.completed_at).length ?? 0;

        // Calculate average progress
        const totalProgress =
          studentBooks?.reduce((sum, sb) => {
            const progress =
              book.page_count > 0
                ? (sb.current_page / book.page_count) * 100
                : 0;
            return sum + Math.min(progress, 100);
          }, 0) ?? 0;

        const averageProgress =
          studentsStarted > 0 ? Math.round(totalProgress / studentsStarted) : 0;
        const completionRate =
          totalStudents > 0
            ? Math.round((studentsCompleted / totalStudents) * 100)
            : 0;

        return {
          bookId,
          bookTitle: book.title,
          bookAuthor: book.author ?? "Unknown",
          bookCoverUrl: book.cover_url,
          assignedClasses: classes
            .filter((c) => assignedClassIds.includes(c.id))
            .map((c) => c.name),
          totalStudents,
          studentsStarted,
          studentsCompleted,
          averageProgress,
          completionRate,
        };
      },
    ),
  );

  return assignments.sort((a, b) => b.totalStudents - a.totalStudents);
}

/**
 * Get quiz assignments for teacher's classes
 */
export async function getTeacherQuizAssignments(
  teacherId: string,
): Promise<QuizAssignment[]> {
  const supabase = getSupabaseAdminClient();

  // Get all classes for this teacher
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name")
    .eq("teacher_id", teacherId);

  if (!classes || classes.length === 0) {
    return [];
  }

  const classIds = classes.map((c) => c.id);

  // Get all quizzes assigned to these classes
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, title, book_id, class_id, books(title)")
    .in("class_id", classIds)
    .eq("quiz_type", "classroom");

  if (!quizzes || quizzes.length === 0) {
    return [];
  }

  // Calculate statistics for each quiz
  const assignments = await Promise.all(
    quizzes.map(async (quiz) => {
      const bookData = Array.isArray(quiz.books) ? quiz.books[0] : quiz.books;
      const bookTitle = bookData?.title ?? "Unknown Book";

      // Get students in this class
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", quiz.class_id);

      const studentIds = classStudents?.map((cs) => cs.student_id) ?? [];
      const totalStudents = studentIds.length;

      if (totalStudents === 0) {
        return {
          quizId: quiz.id,
          quizTitle: quiz.title,
          bookTitle,
          assignedClasses: [
            classes.find((c) => c.id === quiz.class_id)?.name ?? "Unknown",
          ],
          totalStudents: 0,
          studentsAttempted: 0,
          averageScore: 0,
          passRate: 0,
        };
      }

      // Get quiz attempts
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("student_id, score")
        .eq("quiz_id", quiz.id)
        .in("student_id", studentIds);

      const uniqueStudents = new Set(attempts?.map((a) => a.student_id) ?? []);
      const studentsAttempted = uniqueStudents.size;

      const totalScore =
        attempts?.reduce((sum, a) => sum + (a.score ?? 0), 0) ?? 0;
      const averageScore =
        attempts && attempts.length > 0
          ? Math.round(totalScore / attempts.length)
          : 0;

      const passingAttempts =
        attempts?.filter((a) => (a.score ?? 0) >= 70).length ?? 0;
      const passRate =
        attempts && attempts.length > 0
          ? Math.round((passingAttempts / attempts.length) * 100)
          : 0;

      return {
        quizId: quiz.id,
        quizTitle: quiz.title,
        bookTitle,
        assignedClasses: [
          classes.find((c) => c.id === quiz.class_id)?.name ?? "Unknown",
        ],
        totalStudents,
        studentsAttempted,
        averageScore,
        passRate,
      };
    }),
  );

  return assignments.sort((a, b) => b.totalStudents - a.totalStudents);
}
