"use server";

import { queryWithContext } from "@/lib/db";

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
  userId: string,
  teacherId: string,
): Promise<ClassAnalytics[]> {
  // Get all classes for this teacher
  const classesResult = await queryWithContext(
    userId,
    `SELECT id, name FROM classes WHERE teacher_id = $1`,
    [teacherId],
  );

  if (!classesResult.rows || classesResult.rows.length === 0) {
    return [];
  }

  // Get analytics for each class
  const analytics = await Promise.all(
    classesResult.rows.map(async (classroom) => {
      // Get analytics using a single complex query
      const analyticsResult = await queryWithContext(
        userId,
        `
        WITH class_students_list AS (
          SELECT student_id FROM class_students WHERE class_id = $1
        ),
        student_stats AS (
          SELECT
            COUNT(*) as total_students,
            COALESCE(AVG(p.xp), 0) as avg_xp,
            COALESCE(AVG(p.level), 1) as avg_level,
            COALESCE(SUM(p.total_books_completed), 0) as total_books,
            COALESCE(SUM(p.total_pages_read), 0) as total_pages,
            COUNT(CASE WHEN p.last_read_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_students
          FROM class_students_list csl
          LEFT JOIN profiles p ON csl.student_id = p.id
        ),
        quiz_completion AS (
          SELECT COUNT(DISTINCT qa.student_id) as students_with_quizzes
          FROM class_students_list csl
          LEFT JOIN quiz_attempts qa ON csl.student_id = qa.student_id
        )
        SELECT
          ss.total_students,
          ss.active_students,
          ROUND(ss.avg_xp) as average_xp,
          ss.total_books as total_books_read,
          ss.total_pages as total_pages_read,
          ROUND(ss.avg_level) as average_level,
          CASE
            WHEN ss.total_students > 0 THEN ROUND((qc.students_with_quizzes::NUMERIC / ss.total_students) * 100)
            ELSE 0
          END as quiz_completion_rate
        FROM student_stats ss, quiz_completion qc
        `,
        [classroom.id],
      );

      const stats = analyticsResult.rows[0] || {
        total_students: 0,
        active_students: 0,
        average_xp: 0,
        total_books_read: 0,
        total_pages_read: 0,
        average_level: 0,
        quiz_completion_rate: 0,
      };

      return {
        classId: classroom.id,
        className: classroom.name,
        totalStudents: parseInt(stats.total_students || "0"),
        activeStudents: parseInt(stats.active_students || "0"),
        averageXP: parseInt(stats.average_xp || "0"),
        totalBooksRead: parseInt(stats.total_books_read || "0"),
        totalPagesRead: parseInt(stats.total_pages_read || "0"),
        averageLevel: parseInt(stats.average_level || "0"),
        quizCompletionRate: parseInt(stats.quiz_completion_rate || "0"),
      };
    }),
  );

  return analytics;
}

/**
 * Get detailed student performance for a specific class
 */
export async function getClassStudentPerformance(
  userId: string,
  classId: number,
): Promise<StudentPerformance[]> {
  const result = await queryWithContext(
    userId,
    `
    SELECT
      p.id as student_id,
      p.full_name as student_name,
      COALESCE(p.xp, 0) as xp,
      COALESCE(p.level, 1) as level,
      COALESCE(p.total_books_completed, 0) as books_completed,
      COALESCE(p.total_pages_read, 0) as pages_read,
      COALESCE(p.total_quizzes_completed, 0) as quizzes_completed,
      COALESCE(p.reading_streak, 0) as reading_streak,
      p.last_read_date
    FROM class_students cs
    JOIN profiles p ON cs.student_id = p.id
    WHERE cs.class_id = $1
    ORDER BY p.xp DESC
    `,
    [classId],
  );

  return result.rows.map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name ?? "Unknown Student",
    xp: parseInt(row.xp || "0"),
    level: parseInt(row.level || "1"),
    booksCompleted: parseInt(row.books_completed || "0"),
    pagesRead: parseInt(row.pages_read || "0"),
    quizzesCompleted: parseInt(row.quizzes_completed || "0"),
    readingStreak: parseInt(row.reading_streak || "0"),
    lastReadDate: row.last_read_date,
  }));
}

/**
 * Get book assignments for teacher's classes
 */
export async function getTeacherBookAssignments(
  userId: string,
  teacherId: string,
): Promise<BookAssignment[]> {
  const result = await queryWithContext(
    userId,
    `
    WITH teacher_classes AS (
      SELECT id, name FROM classes WHERE teacher_id = $1
    ),
    book_assignments AS (
      SELECT
        b.id as book_id,
        b.title as book_title,
        b.author as book_author,
        b.cover_url as book_cover_url,
        b.page_count,
        cb.class_id,
        tc.name as class_name,
        (SELECT COUNT(DISTINCT student_id) FROM class_students WHERE class_id = cb.class_id) as total_students
      FROM class_books cb
      JOIN books b ON cb.book_id = b.id
      JOIN teacher_classes tc ON cb.class_id = tc.id
    ),
    book_progress AS (
      SELECT
        ba.book_id,
        ba.book_title,
        ba.book_author,
        ba.book_cover_url,
        ba.page_count,
        ARRAY_AGG(DISTINCT ba.class_name) as assigned_classes,
        SUM(ba.total_students) as total_students,
        COUNT(DISTINCT sb.student_id) as students_started,
        COUNT(DISTINCT CASE WHEN sb.completed_at IS NOT NULL THEN sb.student_id END) as students_completed,
        CASE
          WHEN ba.page_count > 0 AND COUNT(sb.student_id) > 0
          THEN ROUND(AVG(LEAST((sb.current_page::NUMERIC / ba.page_count) * 100, 100)))
          ELSE 0
        END as average_progress
      FROM book_assignments ba
      LEFT JOIN class_students cs ON cs.class_id = ba.class_id
      LEFT JOIN student_books sb ON sb.book_id = ba.book_id AND sb.student_id = cs.student_id
      GROUP BY ba.book_id, ba.book_title, ba.book_author, ba.book_cover_url, ba.page_count
    )
    SELECT
      book_id,
      book_title,
      book_author,
      book_cover_url,
      assigned_classes,
      total_students,
      students_started,
      students_completed,
      average_progress,
      CASE
        WHEN total_students > 0 THEN ROUND((students_completed::NUMERIC / total_students) * 100)
        ELSE 0
      END as completion_rate
    FROM book_progress
    ORDER BY total_students DESC
    `,
    [teacherId],
  );

  return result.rows.map((row) => ({
    bookId: row.book_id,
    bookTitle: row.book_title,
    bookAuthor: row.book_author ?? "Unknown",
    bookCoverUrl: row.book_cover_url,
    assignedClasses: row.assigned_classes || [],
    totalStudents: parseInt(row.total_students || "0"),
    studentsStarted: parseInt(row.students_started || "0"),
    studentsCompleted: parseInt(row.students_completed || "0"),
    averageProgress: parseInt(row.average_progress || "0"),
    completionRate: parseInt(row.completion_rate || "0"),
  }));
}

/**
 * Get quiz assignments for teacher's classes
 */
export async function getTeacherQuizAssignments(
  userId: string,
  teacherId: string,
): Promise<QuizAssignment[]> {
  const result = await queryWithContext(
    userId,
    `
    WITH teacher_classes AS (
      SELECT id, name FROM classes WHERE teacher_id = $1
    ),
    quiz_data AS (
      SELECT
        q.id as quiz_id,
        b.title as book_title,
        cb.class_id,
        tc.name as class_name,
        (SELECT COUNT(*) FROM class_students WHERE class_id = cb.class_id) as total_students
      FROM quizzes q
      JOIN books b ON q.book_id = b.id
      JOIN class_books cb ON cb.book_id = q.book_id
      JOIN teacher_classes tc ON cb.class_id = tc.id
      WHERE q.quiz_type = 'classroom'
    ),
    quiz_stats AS (
      SELECT
        qd.quiz_id,
        qd.book_title,
        qd.book_title as quiz_title,
        ARRAY_AGG(DISTINCT qd.class_name) as assigned_classes,
        SUM(DISTINCT qd.total_students) as total_students,
        COUNT(DISTINCT qa.student_id) as students_attempted,
        COALESCE(ROUND(AVG(qa.score)), 0) as average_score,
        CASE
          WHEN COUNT(qa.id) > 0 THEN ROUND((COUNT(CASE WHEN qa.score >= 70 THEN 1 END)::NUMERIC / COUNT(qa.id)) * 100)
          ELSE 0
        END as pass_rate
      FROM quiz_data qd
      LEFT JOIN quiz_attempts qa ON qa.quiz_id = qd.quiz_id
      GROUP BY qd.quiz_id, qd.book_title
    )
    SELECT * FROM quiz_stats
    ORDER BY total_students DESC
    `,
    [teacherId],
  );

  return result.rows.map((row) => ({
    quizId: row.quiz_id,
    quizTitle: row.quiz_title ?? "Quiz",
    bookTitle: row.book_title ?? "Unknown Book",
    assignedClasses: row.assigned_classes || [],
    totalStudents: parseInt(row.total_students || "0"),
    studentsAttempted: parseInt(row.students_attempted || "0"),
    averageScore: parseInt(row.average_score || "0"),
    passRate: parseInt(row.pass_rate || "0"),
  }));
}
