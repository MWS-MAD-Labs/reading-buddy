# Database Migrations: Fix Gamification & Reading Tracking

## Problems
1. **Leaderboard shows 0 XP for everyone**: The `profiles` table is missing gamification columns (xp, level, reading_streak, etc.)
2. **Books not sorting by last read**: The `student_books` table is missing an `updated_at` column

## Solutions
1. Add gamification columns to `profiles` table
2. Add `updated_at` column to `student_books` table

## Steps to Apply Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project: `hbrosmlrvbkmcbyggriv`
3. Go to **SQL Editor** in the left sidebar

**Run Migration 1 - Add Gamification Columns:**
4. Click **New Query**
5. Copy and paste the SQL from `migrations/add_gamification_columns_to_profiles.sql`
6. Click **Run** or press Cmd/Ctrl+Enter
7. Verify success - you should see "Success. No rows returned"

**Run Migration 2 - Add updated_at to student_books:**
8. Click **New Query** again
9. Copy and paste the SQL from `migrations/add_student_books_updated_at.sql`
10. Click **Run** or press Cmd/Ctrl+Enter
11. Verify success - you should see "Success. No rows returned"

### Option 2: Using psql (if you have direct access)
```bash
psql <your_connection_string> -f migrations/add_student_books_updated_at.sql
```

## What These Migrations Do

**Migration 1: Gamification Columns**
- ✅ Adds `xp`, `level`, `reading_streak`, `longest_streak` columns
- ✅ Adds `total_books_completed`, `total_pages_read` columns
- ✅ Adds `total_quizzes_completed`, `total_perfect_quizzes` columns
- ✅ Adds `books_completed`, `pages_read`, `last_read_date` columns
- ✅ Creates indexes for leaderboard performance
- ✅ **Fixes leaderboard showing 0 XP for everyone**

**Migration 2: student_books updated_at**
- ✅ Adds `updated_at TIMESTAMPTZ` column to `student_books`
- ✅ Sets default value to NOW() for new records
- ✅ Backfills existing records (sets to completed_at or started_at)
- ✅ Creates trigger to auto-update on changes
- ✅ **Fixes books sorting by last read**

## Verification
After running both migrations, verify with:

**Check gamification columns:**
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('xp', 'level', 'reading_streak', 'total_pages_read');
```

**Check updated_at column:**
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'student_books' AND column_name = 'updated_at';
```

You should see all columns listed.

## Impact
- ✅ **Leaderboards work**: Staff and student leaderboards will show actual XP/rankings
- ✅ **Reading Journey displays correctly**: Level, XP, streak, books completed all visible
- ✅ **Books sort properly**: Most recently read books appear first
- ✅ **Dashboard "Currently Reading"**: Shows the actual last book you read
- ✅ **XP tracking enabled**: Reading pages, completing books, and quizzes now award XP
- ✅ **No Breaking Changes**: All existing functionality continues to work
