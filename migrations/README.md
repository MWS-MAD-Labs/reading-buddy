# Database Migrations

This directory contains SQL migration files for the Reading Buddy application.

## Structure

Migrations are numbered sequentially: `001_description.sql`, `002_description.sql`, etc.

## Available Migrations

### 001_quiz_enhancements.sql
**Date:** 2025-01-18  
**Status:** Ready to apply

**Changes:**
1. **Books Table** - Add text extraction columns
   - `page_text_content` (JSONB) - Stores extracted PDF text
   - `text_extracted_at` (TIMESTAMP) - When text was extracted
   - `text_extraction_method` (VARCHAR) - Extraction method used

2. **Quizzes Table** - Add page range and quiz type support
   - `page_range_start`, `page_range_end` - For targeted quizzes
   - `quiz_type` - 'checkpoint' or 'classroom'
   - `checkpoint_page` - Page number for checkpoint quizzes

3. **New Tables**
   - `quiz_checkpoints` - Define checkpoint locations in books
   - `student_checkpoint_progress` - Track student progress through checkpoints
   - `badges` - Badge/achievement definitions
   - `student_badges` - Badges earned by students

4. **Default Data**
   - 6 default badges (Checkpoint Champion, Quiz Master, etc.)

5. **Security**
   - Row Level Security (RLS) policies for all new tables
   - Proper access controls for students, teachers, librarians, and admins

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `001_quiz_enhancements.sql`
5. Paste into the editor
6. Click **Run** or press `Cmd/Ctrl + Enter`
7. Verify the success message

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root
cd /path/to/reading-buddy

# Apply migration
supabase db execute --file migrations/001_quiz_enhancements.sql

# Or if using remote database
supabase db execute --file migrations/001_quiz_enhancements.sql --db-url "postgresql://..."
```

### Option 3: Using psql

```bash
# Connect to your database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run migration
\i migrations/001_quiz_enhancements.sql

# Exit
\q
```

## Verification

After applying the migration, verify the changes:

```sql
-- Check new columns on books table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'books' 
AND column_name IN ('page_text_content', 'text_extracted_at', 'text_extraction_method');

-- Check new columns on quizzes table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
AND column_name IN ('page_range_start', 'page_range_end', 'quiz_type', 'checkpoint_page');

-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('quiz_checkpoints', 'student_checkpoint_progress', 'badges', 'student_badges');

-- Check default badges were created
SELECT name, badge_type FROM badges;
```

## Rollback

If you need to rollback this migration, run:

```sql
-- Drop new tables
DROP TABLE IF EXISTS student_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS student_checkpoint_progress CASCADE;
DROP TABLE IF EXISTS quiz_checkpoints CASCADE;

-- Remove columns from quizzes
ALTER TABLE quizzes 
DROP COLUMN IF EXISTS page_range_start,
DROP COLUMN IF EXISTS page_range_end,
DROP COLUMN IF EXISTS quiz_type,
DROP COLUMN IF EXISTS checkpoint_page;

-- Remove columns from books
ALTER TABLE books 
DROP COLUMN IF EXISTS page_text_content,
DROP COLUMN IF EXISTS text_extracted_at,
DROP COLUMN IF EXISTS text_extraction_method;

-- Drop indexes
DROP INDEX IF EXISTS idx_books_text_extracted;
DROP INDEX IF EXISTS idx_quizzes_type;
DROP INDEX IF EXISTS idx_quizzes_checkpoint;
DROP INDEX IF EXISTS idx_quizzes_page_range;
```

## Migration Status Tracking

You can track applied migrations manually or use this table:

```sql
-- Optional: Create migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('001_quiz_enhancements');
```

## Notes

- All migrations are designed to be safe and non-destructive
- Existing data is preserved
- Indexes are created for optimal query performance
- RLS policies ensure proper data access controls
- Triggers maintain `updated_at` timestamps automatically

## Troubleshooting

### Error: "column already exists"
This is safe to ignore - the migration uses `IF NOT EXISTS` clauses.

### Error: "constraint already exists"
The migration drops existing constraints before recreating them.

### Permission denied
Make sure you're connected as a user with sufficient privileges (e.g., `postgres` user).

### RLS policy conflicts
If you have custom RLS policies, you may need to adjust them after migration.
