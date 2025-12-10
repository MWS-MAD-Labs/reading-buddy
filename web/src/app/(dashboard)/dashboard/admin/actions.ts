"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AddUserParams = {
  email: string;
  password: string;
  fullName: string | null;
  role: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
  accessLevel: string | null;
};

export async function addUser(params: AddUserParams): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Create auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
    });

  if (authError) {
    console.error("Error creating auth user:", authError);
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error("User creation failed: No user returned");
  }

  // Update profile with role and other details
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: params.fullName,
      role: params.role,
      access_level: params.accessLevel,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    console.error("Error updating profile:", profileError);
    // Try to clean up the auth user if profile update fails
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to update user profile: ${profileError.message}`);
  }
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
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: params.fullName,
      role: params.role,
      access_level: params.accessLevel,
    })
    .eq("id", params.userId);

  if (error) {
    console.error("Error updating user data:", error);
    throw new Error(`Failed to update user: ${error.message}`);
  }
}

export async function updateUserRole(
  userId: string,
  newRole: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN",
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    console.error("Error updating user role:", error);
    throw new Error(`Failed to update role: ${error.message}`);
  }
}

export async function updateUserAccessLevel(
  userId: string,
  accessLevel: string | null,
): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ access_level: accessLevel })
    .eq("id", userId);

  if (error) {
    console.error("Error updating access level:", error);
    throw new Error(`Failed to update access level: ${error.message}`);
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();

  // Delete from auth (this should cascade to profiles via database trigger)
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) {
    console.error("Error deleting user:", authError);
    throw new Error(`Failed to delete user: ${authError.message}`);
  }
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
  const supabase = getSupabaseAdminClient();
  const result: BulkUploadResult = {
    success: true,
    created: 0,
    failed: 0,
    errors: [],
  };

  for (const user of users) {
    try {
      // Create auth user
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
        });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to create user");
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: user.fullName || null,
          role: user.role,
          access_level: user.accessLevel || null,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        // Clean up auth user if profile update fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(profileError.message);
      }

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
    const supabase = getSupabaseAdminClient();

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, role, access_level, updated_at")
      .order("updated_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return { success: false, error: "Failed to fetch profiles" };
    }

    if (!profiles || profiles.length === 0) {
      return { success: true, users: [] };
    }

    // Fetch emails individually (more reliable than listUsers)
    const usersWithEmails = await Promise.all(
      profiles.map(async (profile) => {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(
            profile.id,
          );
          return {
            ...profile,
            email: userData?.user?.email || null,
          };
        } catch (error) {
          console.error(`Error fetching user ${profile.id}:`, error);
          return {
            ...profile,
            email: null,
          };
        }
      }),
    );

    return { success: true, users: usersWithEmails };
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
    const supabase = getSupabaseAdminClient();

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id");

    if (profilesError || !profiles) {
      return {
        success: false,
        removed: 0,
        orphanedIds: [],
        error: "Failed to fetch profiles",
      };
    }

    const orphanedIds: string[] = [];

    // Check each profile to see if auth user exists
    for (const profile of profiles) {
      try {
        const { error: userError } = await supabase.auth.admin.getUserById(
          profile.id,
        );

        if (userError) {
          // This profile doesn't have a corresponding auth user
          orphanedIds.push(profile.id);
        }
      } catch (error) {
        // If we get an error, consider it orphaned
        orphanedIds.push(profile.id);
      }
    }

    // Delete orphaned profiles
    if (orphanedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .in("id", orphanedIds);

      if (deleteError) {
        return {
          success: false,
          removed: 0,
          orphanedIds,
          error: `Found ${orphanedIds.length} orphaned profiles but failed to delete them`,
        };
      }
    }

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
    const supabase = getSupabaseAdminClient();

    // 1. Get user counts by role
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("role");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return { success: false, error: "Failed to fetch user counts" };
    }

    const userCounts = {
      students: profiles.filter((p) => p.role === "STUDENT").length,
      teachers: profiles.filter((p) => p.role === "TEACHER").length,
      librarians: profiles.filter((p) => p.role === "LIBRARIAN").length,
      admins: profiles.filter((p) => p.role === "ADMIN").length,
      total: profiles.length,
    };

    // 2. Get book stats with format breakdown
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("file_format");

    if (booksError) {
      console.error("Error fetching books:", booksError);
      return { success: false, error: "Failed to fetch book stats" };
    }

    const bookStats = {
      total: books.length,
      byFormat: {
        pdf: books.filter((b) => b.file_format === "pdf").length,
        epub: books.filter((b) => b.file_format === "epub").length,
        mobi: books.filter((b) => b.file_format === "mobi").length,
        azw: books.filter((b) => b.file_format === "azw").length,
        azw3: books.filter((b) => b.file_format === "azw3").length,
      },
    };

    // 3. Get active readers (read in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: recentReaders, error: recentReadersError } = await supabase
      .from("profiles")
      .select("id, last_read_date")
      .gte("last_read_date", sevenDaysAgo.toISOString());

    const { data: previousReaders, error: previousReadersError } =
      await supabase
        .from("profiles")
        .select("id")
        .gte("last_read_date", fourteenDaysAgo.toISOString())
        .lt("last_read_date", sevenDaysAgo.toISOString());

    if (recentReadersError || previousReadersError) {
      console.error(
        "Error fetching active readers:",
        recentReadersError || previousReadersError,
      );
    }

    const currentCount = recentReaders?.length || 0;
    const previousCount = previousReaders?.length || 0;
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

    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select("id, created_at")
      .gte("created_at", firstDayOfMonth.toISOString());

    if (quizzesError) {
      console.error("Error fetching quizzes:", quizzesError);
    }

    // Count descriptions by checking books with ai_description
    let descriptionsCount = 0;
    try {
      const { count, error: descriptionsError } = await supabase
        .from("books")
        .select("id", { count: "exact", head: true })
        .not("ai_description", "is", null);

      if (descriptionsError) {
        console.warn("Unable to fetch descriptions count:", descriptionsError);
      } else {
        descriptionsCount = count || 0;
      }
    } catch (error) {
      console.warn(
        "Supabase threw while fetching descriptions count:",
        error instanceof Error ? error.message : error,
      );
    }

    const aiUsage = {
      quizzesGenerated: quizzes?.length || 0,
      descriptionsGenerated: descriptionsCount || 0,
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
