/**
 * Complete Data Migration from Supabase to Local PostgreSQL
 *
 * This script:
 * 1. Exports all data from Supabase
 * 2. Maps Supabase profile IDs to local users/profiles
 * 3. Imports all data into local PostgreSQL
 * 4. Preserves all relationships
 * 5. Only inserts columns that exist in both schemas
 */

import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

// Load environment variables from .env.local
import { readFileSync } from "fs";
import { join } from "path";

try {
  const envFile = readFileSync(join(process.cwd(), ".env.local"), "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn("Could not load .env.local file");
}

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Local PostgreSQL client
const localPool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5434"),
  database: process.env.DB_NAME || "reading_buddy",
  user: process.env.DB_USER || "reading_buddy",
  password: process.env.DB_PASSWORD,
});

// Tables to migrate in order (respecting foreign keys)
const TABLES = [
  "badges",
  "books",
  "book_access", // Book access levels (UE, JH, TS, etc.)
  "profiles",
  "classes",
  "class_students",
  "class_books",
  "student_books",
  "quizzes",
  "quiz_checkpoints",
  "quiz_attempts",
  "student_badges",
  "xp_transactions",
  "class_quiz_assignments",
  "login_broadcasts",
];

interface UserMapping {
  supabaseProfileId: string;
  localUserId: string;
  localProfileId: string;
  fullName: string;
}

async function main() {
  console.log("🚀 Starting Supabase → Local PostgreSQL migration...\n");

  try {
    // Step 1: Get all Supabase profiles and create local users/profiles
    console.log("📋 Step 1: Mapping Supabase profiles to local users...");
    const userMapping = await createUserMapping();
    console.log(`✅ Mapped ${userMapping.size} users\n`);

    // Step 2: Migrate each table
    for (const table of TABLES) {
      console.log(`📦 Migrating table: ${table}`);
      await migrateTable(table, userMapping);
      console.log(`✅ Completed: ${table}\n`);
    }

    console.log("🎉 Migration completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- Users migrated: ${userMapping.size}`);
    console.log(`- Tables migrated: ${TABLES.length}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await localPool.end();
  }
}

/**
 * Create mapping between Supabase profiles and local users
 * Supabase profiles.id = auth.users.id (UUID)
 * We create local users and profiles for each Supabase profile
 */
async function createUserMapping(): Promise<Map<string, UserMapping>> {
  const mapping = new Map<string, UserMapping>();

  // Get all profiles from Supabase (with all fields)
  const { data: profiles, error } = await supabase.from("profiles").select("*");

  if (error) throw error;

  console.log(`  Found ${profiles?.length || 0} profiles in Supabase\n`);

  for (const profile of profiles || []) {
    // Generate temporary email from profile ID (will be updated on first OAuth login)
    const tempEmail = `migrated_${profile.id.substring(0, 8)}@temp.millennia21.id`;

    // Create new user locally (OAuth user, no password)
    const newUser = await localPool.query(
      "INSERT INTO users (email, name, email_verified) VALUES ($1, $2, NOW()) RETURNING id",
      [tempEmail, profile.full_name],
    );
    const localUserId = newUser.rows[0].id;
    console.log(
      `  ✓ Created user: ${profile.full_name || "Unknown"} (${tempEmail})`,
    );

    // Create profile with ALL migrated data from Supabase
    const newProfile = await localPool.query(
      `INSERT INTO profiles
       (user_id, full_name, role, grade, access_level,
        xp, level, reading_streak, longest_streak, last_read_date,
        total_books_completed, total_pages_read, total_quizzes_completed, total_perfect_quizzes,
        created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id`,
      [
        localUserId,
        profile.full_name,
        profile.role,
        profile.grade,
        profile.access_level || "LOWER_ELEMENTARY",
        profile.xp || 0,
        profile.level || 1,
        profile.reading_streak || 0,
        profile.longest_streak || 0,
        profile.last_read_date || null,
        profile.total_books_completed || 0,
        profile.total_pages_read || 0,
        profile.total_quizzes_completed || 0,
        profile.total_perfect_quizzes || 0,
        profile.created_at || new Date().toISOString(),
        profile.updated_at || new Date().toISOString(),
      ],
    );
    const localProfileId = newProfile.rows[0].id;

    console.log(
      `    → Profile created: XP=${profile.xp || 0}, Level=${profile.level || 1}, Books=${profile.total_books_completed || 0}, Pages=${profile.total_pages_read || 0}`,
    );

    mapping.set(profile.id, {
      supabaseProfileId: profile.id,
      localUserId,
      localProfileId,
      fullName: profile.full_name || "Unknown",
    });
  }

  return mapping;
}

/**
 * Get the columns that exist in the local PostgreSQL table
 */
async function getLocalTableColumns(tableName: string): Promise<Set<string>> {
  const result = await localPool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
     AND table_name = $1`,
    [tableName],
  );
  return new Set(result.rows.map((row) => row.column_name));
}

/**
 * Migrate a single table from Supabase to local PostgreSQL
 */
async function migrateTable(
  tableName: string,
  userMapping: Map<string, UserMapping>,
): Promise<void> {
  // Skip profiles table (already migrated in createUserMapping)
  if (tableName === "profiles") {
    console.log(`  ℹ️  Skipping profiles (already migrated)`);
    return;
  }

  // Get all data from Supabase
  const { data, error } = await supabase.from(tableName).select("*");

  if (error) {
    console.error(`  ⚠️  Error fetching ${tableName}:`, error);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`  ℹ️  No data in ${tableName}`);
    return;
  }

  console.log(`  → Found ${data.length} rows`);

  // Get local table columns
  const localColumns = await getLocalTableColumns(tableName);

  if (localColumns.size === 0) {
    console.log(`  ⚠️  Table ${tableName} does not exist in local database`);
    return;
  }

  // Insert data with ID mapping
  let inserted = 0;
  let skipped = 0;

  for (const row of data) {
    try {
      // Map user IDs based on table
      const mappedRow = mapUserIds(tableName, row, userMapping);

      if (!mappedRow) {
        skipped++;
        continue;
      }

      // Filter to only include columns that exist in local schema
      const filteredRow: any = {};
      for (const [key, value] of Object.entries(mappedRow)) {
        if (localColumns.has(key)) {
          // Handle JSONB conversion for quiz_attempts.answers
          if (
            tableName === "quiz_attempts" &&
            key === "answers" &&
            typeof value === "object"
          ) {
            filteredRow[key] = JSON.stringify(value);
          } else {
            filteredRow[key] = value;
          }
        }
      }

      if (Object.keys(filteredRow).length === 0) {
        skipped++;
        continue;
      }

      // Build INSERT query
      const columns = Object.keys(filteredRow);
      const values = Object.values(filteredRow);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

      const query = `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;

      await localPool.query(query, values);
      inserted++;
    } catch (error: any) {
      if (error.code === "23505") {
        // Duplicate key - skip silently
        skipped++;
      } else if (error.code === "23503") {
        // Foreign key violation - skip
        skipped++;
      } else {
        console.error(`  ⚠️  Error inserting row:`, error.message);
        skipped++;
      }
    }
  }

  console.log(`  ✓ Inserted ${inserted} rows, skipped ${skipped}`);
}

/**
 * Map Supabase profile IDs to local profile IDs
 */
function mapUserIds(
  tableName: string,
  row: any,
  userMapping: Map<string, UserMapping>,
): any {
  const mappedRow = { ...row };

  // Define which columns contain user/profile references for each table
  const userIdColumns: Record<string, string[]> = {
    classes: ["teacher_id"],
    class_students: ["student_id"],
    student_books: ["student_id"],
    quiz_attempts: ["student_id"],
    student_badges: ["student_id"],
    xp_transactions: ["student_id"],
    quizzes: ["created_by_id"],
    class_quiz_assignments: ["assigned_by"],
  };

  const columnsToMap = userIdColumns[tableName] || [];

  for (const column of columnsToMap) {
    if (mappedRow[column]) {
      const mapping = userMapping.get(mappedRow[column]);

      if (mapping) {
        // Map Supabase profile ID to local profile ID
        mappedRow[column] = mapping.localProfileId;
      } else {
        // Skip this row if critical foreign key is missing
        return null;
      }
    }
  }

  return mappedRow;
}

// Run the migration
main().catch(console.error);
