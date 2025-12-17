"use server";

import { query, transaction } from "@/lib/db";
import bcrypt from "bcryptjs";

type AddUserParams = {
  email: string;
  password: string;
  fullName: string | null;
  role: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
  accessLevel: string | null;
};

export async function addUser(params: AddUserParams): Promise<void> {
  await transaction(async (client) => {
    // Hash password
    const passwordHash = await bcrypt.hash(params.password, 10);

    // Create user
    const userResult = await client.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id",
      [params.email, passwordHash, params.fullName],
    );

    const userId = userResult.rows[0].id;

    // Create profile
    await client.query(
      `INSERT INTO profiles (user_id, email, full_name, role, access_level, xp, level, reading_streak, longest_streak)
       VALUES ($1, $2, $3, $4, $5, 0, 1, 0, 0)`,
      [userId, params.email, params.fullName, params.role, params.accessLevel],
    );
  });
}

type UpdateUserDataParams = {
  userId: string;
  fullName: string | null;
  role: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
  accessLevel: string | null;
};

export async function updateUserData(
  params: UpdateUserDataParams,
): Promise<void> {
  const result = await query(
    `UPDATE profiles
     SET full_name = $1, role = $2, access_level = $3, updated_at = NOW()
     WHERE id = $4`,
    [params.fullName, params.role, params.accessLevel, params.userId],
  );

  if (result.rowCount === 0) {
    throw new Error("User not found");
  }
}

export async function updateUserRole(
  userId: string,
  newRole: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN",
): Promise<void> {
  const result = await query(
    `UPDATE profiles SET role = $1, updated_at = NOW() WHERE id = $2`,
    [newRole, userId],
  );

  if (result.rowCount === 0) {
    throw new Error("User not found");
  }
}

export async function updateUserAccessLevel(
  userId: string,
  accessLevel: string | null,
): Promise<void> {
  const result = await query(
    `UPDATE profiles SET access_level = $1, updated_at = NOW() WHERE id = $2`,
    [accessLevel, userId],
  );

  if (result.rowCount === 0) {
    throw new Error("User not found");
  }
}

export async function deleteUser(userId: string): Promise<void> {
  await transaction(async (client) => {
    // Get user_id from profile
    const profileResult = await client.query(
      "SELECT user_id FROM profiles WHERE id = $1",
      [userId],
    );

    if (profileResult.rows.length === 0) {
      throw new Error("Profile not found");
    }

    const authUserId = profileResult.rows[0].user_id;

    // Delete profile (will cascade to related records via DB constraints)
    await client.query("DELETE FROM profiles WHERE id = $1", [userId]);

    // Delete auth user
    await client.query("DELETE FROM users WHERE id = $1", [authUserId]);
  });
}

type BulkUploadResult = {
  success: boolean;
  created: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
};

type BulkUserRow = {
  email: string;
  password: string;
  fullName?: string;
  role: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
  accessLevel?: string;
};

export async function bulkUploadUsers(
  users: BulkUserRow[],
): Promise<BulkUploadResult> {
  const result: BulkUploadResult = {
    success: true,
    created: 0,
    failed: 0,
    errors: [],
  };

  for (const user of users) {
    try {
      await addUser({
        email: user.email,
        password: user.password,
        fullName: user.fullName || null,
        role: user.role,
        accessLevel: user.accessLevel || null,
      });
      result.created++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        email: user.email,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  result.success = result.failed === 0;
  return result;
}

export type SystemStats = {
  userCounts: {
    students: number;
    teachers: number;
    librarians: number;
    admins: number;
    total: number;
  };
  bookStats: {
    total: number;
    byFormat: {
      pdf: number;
      epub: number;
      mobi: number;
      azw: number;
      azw3: number;
    };
  };
  activeReaders: {
    count: number;
    percentageChange: number; // vs previous 7 days
  };
  aiUsage: {
    quizzesGenerated: number;
    descriptionsGenerated: number;
    currentProvider: "cloud" | "local";
  };
};

export async function getUsersWithEmails(): Promise<{
  success: boolean;
  users?: Array<{
    id: string;
    full_name: string | null;
    role: string;
    access_level: string | null;
    email: string | null;
  }>;
  error?: string;
}> {
  try {
    const result = await query(`
      SELECT
        p.id,
        p.full_name,
        p.role,
        p.access_level,
        p.email,
        p.updated_at
      FROM profiles p
      ORDER BY p.updated_at DESC
    `);

    return {
      success: true,
      users: result.rows.map((row) => ({
        id: row.id,
        full_name: row.full_name,
        role: row.role,
        access_level: row.access_level,
        email: row.email,
      })),
    };
  } catch (error) {
    console.error("Error in getUsersWithEmails:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function cleanupOrphanedProfiles(): Promise<{
  success: boolean;
  removed: number;
  orphanedIds: string[];
  error?: string;
}> {
  try {
    // Find profiles without corresponding users
    const result = await query(`
      DELETE FROM profiles
      WHERE user_id NOT IN (SELECT id FROM users)
      RETURNING id
    `);

    const orphanedIds = result.rows.map((row) => row.id);

    return {
      success: true,
      removed: orphanedIds.length,
      orphanedIds,
    };
  } catch (error) {
    console.error("Error in cleanupOrphanedProfiles:", error);
    return {
      success: false,
      removed: 0,
      orphanedIds: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getSystemStats(): Promise<{
  success: boolean;
  data?: SystemStats;
  error?: string;
}> {
  try {
    // 1. Get user counts by role
    const userCountsResult = await query(`
      SELECT
        role,
        COUNT(*) as count
      FROM profiles
      GROUP BY role
    `);

    const userCounts = {
      students: 0,
      teachers: 0,
      librarians: 0,
      admins: 0,
      total: 0,
    };

    for (const row of userCountsResult.rows) {
      const count = parseInt(row.count);
      userCounts.total += count;

      if (row.role === "STUDENT") userCounts.students = count;
      else if (row.role === "TEACHER") userCounts.teachers = count;
      else if (row.role === "LIBRARIAN") userCounts.librarians = count;
      else if (row.role === "ADMIN") userCounts.admins = count;
    }

    // 2. Get book stats with format breakdown
    const bookStatsResult = await query(`
      SELECT
        file_format,
        COUNT(*) as count
      FROM books
      GROUP BY file_format
    `);

    const bookStats = {
      total: 0,
      byFormat: {
        pdf: 0,
        epub: 0,
        mobi: 0,
        azw: 0,
        azw3: 0,
      },
    };

    for (const row of bookStatsResult.rows) {
      const count = parseInt(row.count);
      bookStats.total += count;

      const format = row.file_format?.toLowerCase();
      if (format === "pdf") bookStats.byFormat.pdf = count;
      else if (format === "epub") bookStats.byFormat.epub = count;
      else if (format === "mobi") bookStats.byFormat.mobi = count;
      else if (format === "azw") bookStats.byFormat.azw = count;
      else if (format === "azw3") bookStats.byFormat.azw3 = count;
    }

    // 3. Get active readers (read in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const activeReadersResult = await query(
      `
      SELECT
        (SELECT COUNT(*) FROM profiles WHERE last_read_date >= $1) as current_count,
        (SELECT COUNT(*) FROM profiles WHERE last_read_date >= $2 AND last_read_date < $1) as previous_count
    `,
      [sevenDaysAgo.toISOString(), fourteenDaysAgo.toISOString()],
    );

    const currentCount = parseInt(
      activeReadersResult.rows[0].current_count || "0",
    );
    const previousCount = parseInt(
      activeReadersResult.rows[0].previous_count || "0",
    );
    const percentageChange =
      previousCount > 0
        ? ((currentCount - previousCount) / previousCount) * 100
        : currentCount > 0
          ? 100
          : 0;

    const activeReaders = {
      count: currentCount,
      percentageChange: Math.round(percentageChange),
    };

    // 4. Get AI usage stats (quizzes generated this month)
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const quizzesResult = await query(
      `SELECT COUNT(*) as count FROM quizzes WHERE created_at >= $1`,
      [firstDayOfMonth.toISOString()],
    );

    const descriptionsResult = await query(
      `SELECT COUNT(*) as count FROM books WHERE description IS NOT NULL AND description != ''`,
    );

    const aiUsage = {
      quizzesGenerated: parseInt(quizzesResult.rows[0].count || "0"),
      descriptionsGenerated: parseInt(descriptionsResult.rows[0].count || "0"),
      currentProvider:
        (process.env.AI_PROVIDER as "cloud" | "local") || "local",
    };

    const stats: SystemStats = {
      userCounts,
      bookStats,
      activeReaders,
      aiUsage,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error in getSystemStats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
