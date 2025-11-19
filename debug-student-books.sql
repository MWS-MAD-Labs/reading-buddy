-- =============================================
-- Debug: Check student_books table and RLS policies
-- Purpose: Diagnose why books in progress aren't showing
-- =============================================

-- 1. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'student_books';
-- Should show: rowsecurity = true

-- 2. Check existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'student_books'
ORDER BY policyname;
-- Should show 4 policies if fix was applied

-- 3. Check if there's any data in student_books
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT student_id) as unique_students,
  COUNT(DISTINCT book_id) as unique_books
FROM student_books;
-- Should show if any data exists

-- 4. Check recent student_books records (last 10)
SELECT
  sb.id,
  sb.student_id,
  sb.book_id,
  sb.current_page,
  sb.completed,
  sb.started_at,
  sb.completed_at,
  b.title as book_title,
  p.full_name as student_name
FROM student_books sb
LEFT JOIN books b ON sb.book_id = b.id
LEFT JOIN profiles p ON sb.student_id = p.id
ORDER BY sb.started_at DESC
LIMIT 10;
-- Shows recent reading activity with names

-- 5. Check if current user can see their own data
-- (Run this as the student user who is having issues)
SELECT
  sb.id,
  sb.book_id,
  sb.current_page,
  b.title
FROM student_books sb
LEFT JOIN books b ON sb.book_id = b.id
WHERE sb.student_id = auth.uid()
ORDER BY sb.started_at DESC;
-- If this returns empty but #4 shows data, RLS is blocking

-- 6. Test upsert permission (run as student)
-- This simulates what happens when saving progress
-- DO NOT actually run this, just check if you have permission:
-- INSERT INTO student_books (student_id, book_id, current_page)
-- VALUES (auth.uid(), 13, 5)
-- ON CONFLICT (student_id, book_id)
-- DO UPDATE SET current_page = 5;

-- 7. Check the student_books table schema
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'student_books'
ORDER BY ordinal_position;

-- Expected results if everything is correct:
-- ✅ RLS is enabled
-- ✅ 4 policies exist
-- ✅ Data exists in table
-- ✅ Student can SELECT their own records
-- ✅ Student can INSERT/UPDATE their own records
