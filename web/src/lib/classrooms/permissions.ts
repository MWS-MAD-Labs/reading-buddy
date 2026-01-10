import { query } from "@/lib/db";
import type { UserRole } from "@/lib/auth/roleCheck";

/**
 * Ensures that the provided user can manage a specific class.
 * Admins bypass this check; teachers must own the class.
 */
export const assertCanManageClass = async (
  classId: number,
  userId: string,
  role: UserRole,
) => {
  if (role === "ADMIN") {
    return;
  }

  try {
    const result = await query(
      `SELECT teacher_id FROM classes WHERE id = $1`,
      [classId]
    );

    const data = result.rows[0];

    if (!data || data.teacher_id !== userId) {
      throw new Error("You are not allowed to manage this class.");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "You are not allowed to manage this class.") {
      throw error;
    }
    throw new Error(`Unable to verify class ownership: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
