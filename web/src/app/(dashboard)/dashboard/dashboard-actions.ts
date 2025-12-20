"use server";

import { queryWithContext } from "@/lib/db";
import { getGamificationStats } from "@/lib/gamification";

/**
 * Get reading journey data for any user
 */
export async function getReadingJourneyData(userId: string, profileId: string) {
  try {
    // Get gamification stats
    const stats = await getGamificationStats(userId, profileId);

    const statsWithLegacyFields = stats
      ? {
          ...stats,
          // Legacy aliases to keep older UI pieces safe
          total_xp: stats.xp ?? 0,
          current_level_min_xp: 0,
          next_level_min_xp: (stats.xp ?? 0) + (stats.xp_to_next_level ?? 0),
        }
      : null;

    // Get current reading book
    const currentReadingResult = await queryWithContext(
      userId,
      `SELECT
        sb.book_id,
        sb.current_page,
        sb.updated_at,
        sb.started_at,
        b.id,
        b.title,
        b.author,
        b.cover_url,
        b.page_count
      FROM student_books sb
      JOIN books b ON sb.book_id = b.id
      WHERE sb.student_id = $1
      ORDER BY sb.updated_at DESC, sb.started_at DESC
      LIMIT 1`,
      [profileId],
    );

    let currentBook = null;
    if (currentReadingResult.rows.length > 0) {
      const row = currentReadingResult.rows[0];
      const estimatedTotalPages = row.page_count || 300;
      const currentPage = row.current_page || 1;
      const progressPercentage = Math.min(
        (currentPage / estimatedTotalPages) * 100,
        100,
      );

      currentBook = {
        id: row.id,
        title: row.title,
        author: row.author,
        cover_url: row.cover_url,
        current_page: currentPage,
        total_pages: estimatedTotalPages,
        progress_percentage: progressPercentage,
      };
    }

    return {
      success: true,
      data: {
        stats: statsWithLegacyFields,
        currentBook,
      },
    };
  } catch (error) {
    console.error("Error fetching reading journey data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get teacher overview data
 */
export async function getTeacherOverview(
  userId: string,
  profileId: string,
  role: string,
) {
  try {
    // Get teacher's classes (or all classes for admin)
    const classesQuery =
      role === "TEACHER"
        ? `SELECT id, name FROM classes WHERE teacher_id = $1`
        : `SELECT id, name FROM classes`;

    const classesParams = role === "TEACHER" ? [profileId] : [];
    const classesResult = await queryWithContext(
      userId,
      classesQuery,
      classesParams,
    );
    const classIds = classesResult.rows.map((c: any) => c.id);

    if (classIds.length === 0) {
      return {
        success: true,
        data: {
          classCount: 0,
          studentCount: 0,
          completionRate: 0,
          activeAssignments: 0,
          recentCompletions: [],
        },
      };
    }

    // Get students in these classes
    const studentsResult = await queryWithContext(
      userId,
      `SELECT DISTINCT student_id FROM class_students WHERE class_id = ANY($1)`,
      [classIds],
    );
    const studentIds = studentsResult.rows.map((row: any) => row.student_id);

    // Get total assignments count
    const totalAssignmentsResult = await queryWithContext(
      userId,
      studentIds.length > 0
        ? `SELECT COUNT(*) as count FROM student_books WHERE student_id = ANY($1)`
        : `SELECT 0 as count`,
      studentIds.length > 0 ? [studentIds] : [],
    );
    const totalAssignments = parseInt(
      totalAssignmentsResult.rows[0]?.count || "0",
    );

    // Get completed assignments count
    const completedAssignmentsResult = await queryWithContext(
      userId,
      studentIds.length > 0
        ? `SELECT COUNT(*) as count FROM student_books WHERE student_id = ANY($1) AND completed_at IS NOT NULL`
        : `SELECT 0 as count`,
      studentIds.length > 0 ? [studentIds] : [],
    );
    const completedAssignments = parseInt(
      completedAssignmentsResult.rows[0]?.count || "0",
    );

    // Get active assignments count
    const activeAssignmentsResult = await queryWithContext(
      userId,
      `SELECT COUNT(*) as count FROM class_books WHERE class_id = ANY($1)`,
      [classIds],
    );
    const activeAssignments = parseInt(
      activeAssignmentsResult.rows[0]?.count || "0",
    );

    // Get recent completions
    const recentCompletionsResult = await queryWithContext(
      userId,
      studentIds.length > 0
        ? `SELECT
          sb.student_id,
          sb.completed_at,
          p.full_name as student_name,
          b.title as book_title
        FROM student_books sb
        JOIN profiles p ON sb.student_id = p.id
        JOIN books b ON sb.book_id = b.id
        WHERE sb.student_id = ANY($1) AND sb.completed_at IS NOT NULL
        ORDER BY sb.completed_at DESC
        LIMIT 3`
        : `SELECT NULL as student_id, NULL as completed_at, NULL as student_name, NULL as book_title WHERE false`,
      studentIds.length > 0 ? [studentIds] : [],
    );

    const completionRate =
      totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0;

    return {
      success: true,
      data: {
        classCount: classIds.length,
        studentCount: studentIds.length,
        completionRate,
        activeAssignments,
        recentCompletions: recentCompletionsResult.rows.map((entry: any) => ({
          student: entry.student_name || "Unknown student",
          bookTitle: entry.book_title || "Unknown book",
          completedAt: entry.completed_at,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching teacher overview:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
