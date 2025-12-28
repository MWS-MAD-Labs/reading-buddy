import { getSupabaseAdminClient } from "@/lib/supabase/admin";
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

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Database connection not available");
  }
  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("teacher_id")
    .eq("id", classId)
    .single();

  if (error) {
    throw new Error(`Unable to verify class ownership: ${error.message}`);
  }

  if (!data || data.teacher_id !== userId) {
    throw new Error("You are not allowed to manage this class.");
  }
};
