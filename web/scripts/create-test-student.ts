import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing required environment variables");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestStudent() {
  console.log("🎒 Creating test student account...\n");

  const email = "student-test@example.com";
  const password = "TestPassword123!";
  const fullName = "Test Student";

  // Create the user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

  if (authError) {
    console.error("❌ Error creating user:", authError.message);
    process.exit(1);
  }

  console.log("✅ User created successfully");
  console.log("   User ID:", authData.user.id);

  // Update the profile with role
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: "STUDENT",
      full_name: fullName,
    })
    .eq("id", authData.user.id);

  if (profileError) {
    console.error("❌ Error updating profile:", profileError.message);
    process.exit(1);
  }

  console.log("✅ Profile updated with STUDENT role\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Test student account created!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nLogin credentials:");
  console.log("  📧 Email:    ", email);
  console.log("  🔑 Password: ", password);
  console.log("\nYou can now log in at: http://localhost:3000/login");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

createTestStudent().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
