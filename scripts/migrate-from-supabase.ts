/**
 * Complete Data Migration from Supabase to Local PostgreSQL
 *
 * This script:
 * 1. Exports all data from Supabase
 * 2. Maps Supabase auth.users to local users table
 * 3. Imports all data into local PostgreSQL
 * 4. Preserves all relationships
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Local PostgreSQL client
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5434'),
  database: process.env.DB_NAME || 'reading_buddy',
  user: process.env.DB_USER || 'reading_buddy',
  password: process.env.DB_PASSWORD,
});

// Tables to migrate in order (respecting foreign keys)
const TABLES = [
  'badges',
  'books',
  'profiles',
  'classes',
  'class_students',
  'class_books',
  'student_books',
  'quizzes',
  'quiz_checkpoints',
  'quiz_attempts',
  'student_badges',
  'xp_transactions',
  'class_quiz_assignments',
  'login_broadcasts',
];

interface UserMapping {
  supabaseAuthId: string;
  localUserId: string;
  localProfileId: string;
  email: string;
}

async function main() {
  console.log('🚀 Starting Supabase → Local PostgreSQL migration...\n');

  try {
    // Step 1: Get all Supabase users and create mapping
    console.log('📋 Step 1: Mapping Supabase users to local users...');
    const userMapping = await createUserMapping();
    console.log(`✅ Mapped ${userMapping.size} users\n`);

    // Step 2: Migrate each table
    for (const table of TABLES) {
      console.log(`📦 Migrating table: ${table}`);
      await migrateTable(table, userMapping);
      console.log(`✅ Completed: ${table}\n`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users migrated: ${userMapping.size}`);
    console.log(`- Tables migrated: ${TABLES.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await localPool.end();
  }
}

/**
 * Create mapping between Supabase auth users and local users
 */
async function createUserMapping(): Promise<Map<string, UserMapping>> {
  const mapping = new Map<string, UserMapping>();

  // Get all profiles from Supabase
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role');

  if (error) throw error;

  for (const profile of profiles || []) {
    // Check if user exists in local database
    const existingUser = await localPool.query(
      'SELECT id FROM users WHERE email = $1',
      [profile.email]
    );

    let localUserId: string;

    if (existingUser.rows.length > 0) {
      // User already exists locally
      localUserId = existingUser.rows[0].id;
      console.log(`  ↻ User exists: ${profile.email}`);
    } else {
      // Create new user locally (OAuth user, no password)
      const newUser = await localPool.query(
        'INSERT INTO users (email, name, email_verified) VALUES ($1, $2, NOW()) RETURNING id',
        [profile.email, profile.full_name]
      );
      localUserId = newUser.rows[0].id;
      console.log(`  ✓ Created user: ${profile.email}`);
    }

    // Get or create profile
    const existingProfile = await localPool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [localUserId]
    );

    let localProfileId: string;

    if (existingProfile.rows.length > 0) {
      localProfileId = existingProfile.rows[0].id;
    } else {
      // Create profile
      const newProfile = await localPool.query(
        `INSERT INTO profiles
         (user_id, email, full_name, role, xp, level, reading_streak, longest_streak)
         VALUES ($1, $2, $3, $4, 0, 1, 0, 0)
         RETURNING id`,
        [localUserId, profile.email, profile.full_name, profile.role]
      );
      localProfileId = newProfile.rows[0].id;
    }

    mapping.set(profile.id, {
      supabaseAuthId: profile.id,
      localUserId,
      localProfileId,
      email: profile.email,
    });
  }

  return mapping;
}

/**
 * Migrate a single table from Supabase to local PostgreSQL
 */
async function migrateTable(
  tableName: string,
  userMapping: Map<string, UserMapping>
): Promise<void> {
  // Get all data from Supabase
  const { data, error } = await supabase.from(tableName).select('*');

  if (error) {
    console.error(`  ⚠️  Error fetching ${tableName}:`, error);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`  ℹ️  No data in ${tableName}`);
    return;
  }

  console.log(`  → Found ${data.length} rows`);

  // Clear existing data in local table (optional - comment out if you want to keep existing data)
  // await localPool.query(`DELETE FROM ${tableName}`);

  // Insert data with ID mapping
  let inserted = 0;
  let skipped = 0;

  for (const row of data) {
    try {
      // Map user IDs based on table
      const mappedRow = mapUserIds(tableName, row, userMapping);

      // Build INSERT query
      const columns = Object.keys(mappedRow);
      const values = Object.values(mappedRow);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;

      await localPool.query(query, values);
      inserted++;
    } catch (error: any) {
      skipped++;
      if (error.code !== '23505') { // Ignore duplicate key errors
        console.error(`  ⚠️  Error inserting row:`, error.message);
      }
    }
  }

  console.log(`  ✓ Inserted ${inserted} rows, skipped ${skipped}`);
}

/**
 * Map Supabase user IDs to local user/profile IDs
 */
function mapUserIds(
  tableName: string,
  row: any,
  userMapping: Map<string, UserMapping>
): any {
  const mappedRow = { ...row };

  // Define which columns contain user references for each table
  const userIdColumns: Record<string, string[]> = {
    profiles: ['id', 'user_id'],
    classes: ['teacher_id'],
    class_students: ['student_id'],
    student_books: ['student_id'],
    quiz_attempts: ['student_id'],
    student_badges: ['student_id'],
    xp_transactions: ['student_id'],
    quizzes: ['created_by_id'],
    class_quiz_assignments: ['assigned_by'],
  };

  const columnsToMap = userIdColumns[tableName] || [];

  for (const column of columnsToMap) {
    if (mappedRow[column]) {
      const mapping = userMapping.get(mappedRow[column]);

      if (mapping) {
        // Special handling for profiles table
        if (tableName === 'profiles') {
          if (column === 'id') {
            mappedRow[column] = mapping.localProfileId;
          } else if (column === 'user_id') {
            mappedRow[column] = mapping.localUserId;
          }
        } else {
          // For other tables, map to local profile ID
          mappedRow[column] = mapping.localProfileId;
        }
      } else {
        console.warn(`    ⚠️  No mapping found for user ID: ${mappedRow[column]}`);
      }
    }
  }

  return mappedRow;
}

// Run the migration
main().catch(console.error);
