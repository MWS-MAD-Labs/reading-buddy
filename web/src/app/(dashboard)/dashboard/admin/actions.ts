"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type UserRole = "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";

export const updateUserRole = async (input: {
  userId: string;
  role: UserRole;
}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update roles.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: input.role })
    .eq("id", input.userId);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard/admin");
};

export const updateUserAccessLevel = async (input: {
  userId: string;
  accessLevel: string | null;
}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update access levels.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ access_level: input.accessLevel })
    .eq("id", input.userId);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard/admin");
};

export const updateUserData = async (input: {
  userId: string;
  fullName: string | null;
  role: UserRole;
  accessLevel: string | null;
}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update user data.");
  }

  console.log("Updating user:", input.userId, "with data:", {
    full_name: input.fullName,
    role: input.role,
    access_level: input.accessLevel,
  });

  const supabaseAdmin = getSupabaseAdminClient();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: input.fullName,
      role: input.role,
      access_level: input.accessLevel,
    })
    .eq("id", input.userId)
    .select();

  console.log("Update result:", { data, error });

  if (error) {
    console.error("Update error:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No rows were updated. User may not exist.");
  }

  revalidatePath("/dashboard/admin");
  return data[0];
};

export const addUser = async (input: {
  email: string;
  password: string;
  fullName: string | null;
  role: UserRole;
  accessLevel: string | null;
}) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to add users.");
  }

  const supabaseAdmin = getSupabaseAdminClient();

  // Create auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

  if (authError) {
    throw new Error(`Failed to create user: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error("Failed to create user: No user data returned");
  }

  // Create or update profile
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: authData.user.id,
    full_name: input.fullName,
    role: input.role,
    access_level: input.accessLevel,
  });

  if (profileError) {
    // If profile creation fails, try to delete the auth user to maintain consistency
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  revalidatePath("/dashboard/admin");
};

export const deleteUser = async (userId: string) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete users.");
  }

  // Don't allow users to delete themselves
  if (user.id === userId) {
    throw new Error("You cannot delete your own account from the admin panel.");
  }

  const supabaseAdmin = getSupabaseAdminClient();

  // Delete profile first
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    throw new Error(`Failed to delete profile: ${profileError.message}`);
  }

  // Then delete auth user
  const { error: authError } =
    await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) {
    throw new Error(`Failed to delete auth user: ${authError.message}`);
  }

  revalidatePath("/dashboard/admin");
};

export const bulkUploadUsers = async (csvText: string) => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to bulk upload users.");
  }

  const supabaseAdmin = getSupabaseAdminClient();

  // Parse CSV
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    throw new Error(
      "CSV file must contain a header row and at least one data row.",
    );
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // Validate required headers
  const requiredHeaders = ["email", "password", "role"];
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`CSV missing required column: ${header}`);
    }
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Process each row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    try {
      const values = line.split(",").map((v) => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      const email = row.email;
      const password = row.password;
      const fullName = row.full_name || null;
      const role = row.role?.toUpperCase() as UserRole;
      const accessLevel = row.access_level || null;

      // Validate row data
      if (!email || !password || !role) {
        throw new Error("Missing required fields: email, password, or role");
      }

      if (!["STUDENT", "TEACHER", "LIBRARIAN", "ADMIN"].includes(role)) {
        throw new Error(`Invalid role: ${role}`);
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      // Check if user already exists
      const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingAuth?.users.find((u) => u.email === email);

      if (existingUser) {
        // Update existing user
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            full_name: fullName,
            role,
            access_level: accessLevel,
          })
          .eq("id", existingUser.id);

        if (profileError) {
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
      } else {
        // Create new user
        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

        if (authError) {
          throw new Error(`Failed to create auth user: ${authError.message}`);
        }

        if (!authData.user) {
          throw new Error("No user data returned from auth creation");
        }

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: authData.user.id,
            full_name: fullName,
            role,
            access_level: accessLevel,
          });

        if (profileError) {
          // Cleanup: delete auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }
      }

      results.success++;
    } catch (error) {
      results.failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      results.errors.push(
        `Row ${i + 1} (${line.substring(0, 30)}...): ${errorMsg}`,
      );
    }
  }

  revalidatePath("/dashboard/admin");
  return results;
};
