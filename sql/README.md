# Database SQL Files

This directory contains all SQL scripts for the Reading Buddy database.

## Main Setup File

**[`database-setup.sql`](../database-setup.sql)** - Complete database setup for new installations

This file includes:
- All tables, types, and enums
- Row Level Security (RLS) policies
- Indexes for performance
- Functions and triggers
- All migrations up to v1.2.0

**Usage:**
```sql
-- Run in Supabase SQL Editor for new installations
-- Copy and paste the entire content
```

## Directory Structure

```
sql/
├── migrations/
│   ├── 20*.sql              # Deploy-safe migrations applied in CI/CD order
│   └── 2024-12-14/          # Historical migrations (already in main setup)
│       ├── add-file-format-support.sql
│       ├── add-book-specific-badges.sql
│       ├── add_student_books_updated_at.sql
│       ├── add-gamification-system.sql
│       ├── add-mobi-azw-support.sql
│       ├── create_weekly_challenges_table.sql
│       └── add_text_extraction_error_tracking.sql
└── utilities/               # Helper/debug queries
    ├── check-user-role.sql
    └── check-quiz.sql
```

## Migrations (Historical)

### Deploy-safe migrations

Top-level files in `sql/migrations/` with names matching `20*.sql` are treated as
the deploy migration stream for existing environments.

These are the files the automation runner applies:

- from `sql/deploy-migrations.txt` when that manifest is present
- in lexicographic order
- once per environment
- with checksum tracking in `public.schema_migrations`

Guidelines for future schema changes:

1. Put new production/staging schema changes at the top level of `sql/migrations/`
2. Use a sortable filename such as `20260422_add_example_column.sql`
3. Add the filename to `sql/deploy-migrations.txt`
4. Make migrations idempotent with `IF NOT EXISTS` / `IF EXISTS` where possible
5. Do not put new deploy migrations into historical subdirectories

The host-side runner is:

```bash
bash scripts/apply_sql_migrations_via_docker.sh \
  --db-container reading-buddy-postgres-staging \
  --db-user reading_buddy \
  --db-name reading_buddy \
  --migrations-dir sql/migrations
```

### CI/CD preparation

Staging and production workflows now include guarded migration steps.
They only run when the matching repository variable is enabled:

- `AUTO_DB_MIGRATE_STAGING=true`
- `AUTO_DB_MIGRATE_PRODUCTION=true`

And the matching SSH secrets are configured:

- `STAGING_DEPLOY_HOST`
- `STAGING_DEPLOY_USER`
- `STAGING_DEPLOY_SSH_KEY`
- `PRODUCTION_DEPLOY_HOST`
- `PRODUCTION_DEPLOY_USER`
- `PRODUCTION_DEPLOY_SSH_KEY`

### 2024-12-14 Migrations

All migrations from this date are **already included** in `database-setup.sql`. These files are kept for historical reference and documentation purposes.

1. **add-file-format-support.sql** ✅ Included
   - Adds `file_format`, `original_file_url`, `file_size_bytes` to books
   - Supports PDF, EPUB formats

2. **add-book-specific-badges.sql** ✅ Included
   - Adds `book_id` and `created_by` to badges table
   - Book-specific achievement system

3. **add_student_books_updated_at.sql** ✅ Included
   - Adds `updated_at` column to student_books
   - Enables proper "recently read" sorting

4. **add-gamification-system.sql** ✅ Included
   - Adds XP, levels, streaks to profiles
   - Enhanced achievement tracking

5. **add-mobi-azw-support.sql** ✅ Included
   - Extends format support to MOBI, AZW, AZW3

6. **create_weekly_challenges_table.sql** ✅ Included
   - Weekly challenge tracking system
   - XP rewards for completion

7. **add_text_extraction_error_tracking.sql** ✅ Included
   - Error tracking for PDF text extraction
   - Retry mechanism support

## Utility Scripts

### check-user-role.sql
Check current user's role and permissions

```sql
-- Usage: Run in Supabase SQL Editor to debug authentication issues
```

### check-quiz.sql
Query quiz data for debugging

```sql
-- Usage: Check quiz existence and permissions
```

## For New Installations

**Step 1:** Use the main setup file
```bash
# Go to Supabase Dashboard → SQL Editor
# Copy content from database-setup.sql
# Paste and run
```

**Step 2:** Verify installation
```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Should see: badges, books, classrooms, profiles, quizzes, etc.
```

**Step 3:** Test RLS policies
```sql
-- Create test user via Supabase Auth
-- Set role in profiles table
-- Test data access
```

## For Existing Installations

If you already have a database from v1.0.0 or v1.1.0:

**Option 1: Fresh Install (Recommended)**
1. Export your data
2. Drop and recreate database
3. Run `database-setup.sql`
4. Import data

**Option 2: Run Migrations Individually**
1. Check which migrations you need
2. Run them in chronological order
3. Verify each migration succeeded

## Database Schema Version

Current schema version in `database-setup.sql`: **v1.2.0**

Includes all features through:
- ✅ v1.0.0 - Core platform
- ✅ v1.1.0 - Analytics & UX improvements
- ✅ v1.2.0 - CI/CD & quality improvements

## Important Notes

⚠️ **Row Level Security (RLS)**
- All tables have RLS enabled
- Policies enforce role-based access
- Test thoroughly after any schema changes

⚠️ **Foreign Keys**
- CASCADE deletes configured where appropriate
- Profile deletion cascades to related data
- Book deletion removes related quizzes, progress, etc.

⚠️ **Indexes**
- Performance indexes on commonly queried columns
- Composite indexes for complex queries
- Monitor query performance and add indexes as needed

## Troubleshooting

### Common Issues

**Issue:** Migration fails with "relation already exists"
```sql
-- Solution: Use IF NOT EXISTS or IF EXISTS
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;
```

**Issue:** RLS policy blocks query
```sql
-- Solution: Check user role and policy conditions
SELECT current_user, current_setting('request.jwt.claims', true)::json->>'role';
```

**Issue:** Function permission denied
```sql
-- Solution: Grant execute permissions
GRANT EXECUTE ON FUNCTION function_name TO authenticated;
```

## References

- **Main Setup:** [`database-setup.sql`](../database-setup.sql)
- **Deployment Guide:** [`notes/2024-12-14/deployment/DATABASE_SETUP.md`](../notes/2024-12-14/deployment/DATABASE_SETUP.md)
- **Schema Documentation:** See comments in `database-setup.sql`

---

**Last Updated:** 2024-12-14  
**Database Version:** v1.2.0
