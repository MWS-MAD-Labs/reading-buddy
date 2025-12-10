# Database Migration: Add updated_at to student_books

## Problem
The `student_books` table is missing an `updated_at` column, so we can't properly sort books by "most recently read". Currently it sorts by `started_at` which shows when the book was first opened, not when it was last read.

## Solution
Add an `updated_at` column and trigger to automatically update it when a student reads a page.

## Steps to Apply Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project: `hbrosmlrvbkmcbyggriv`
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the SQL from `migrations/add_student_books_updated_at.sql`
6. Click **Run** or press Cmd/Ctrl+Enter
7. Verify success - you should see "Success. No rows returned"

### Option 2: Using psql (if you have direct access)
```bash
psql <your_connection_string> -f migrations/add_student_books_updated_at.sql
```

## What This Does
- ✅ Adds `updated_at TIMESTAMPTZ` column to `student_books`
- ✅ Sets default value to NOW() for new records
- ✅ Backfills existing records (sets to completed_at or started_at)
- ✅ Creates trigger to auto-update on changes
- ✅ Enables proper sorting by "last read"

## Verification
After running the migration, verify with:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'student_books' AND column_name = 'updated_at';
```

You should see the `updated_at` column listed.

## Impact
- **Students**: Books will now appear in correct order (last read first)
- **Dashboard**: "Currently Reading" card will show actual last read book
- **No Breaking Changes**: Existing functionality continues to work
