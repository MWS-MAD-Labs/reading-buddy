-- =============================================
-- Fix: Add missing RLS policies for student_books table
-- Purpose: Fix "No books in progress" showing even when students are reading
-- Date: 2025-11-19
-- =============================================

-- Problem: student_books table has RLS enabled but no policies defined
-- This prevents students from reading or writing their own progress

-- Solution: Add proper RLS policies

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Students can view their own reading progress" ON student_books;
DROP POLICY IF EXISTS "Students can insert their own reading progress" ON student_books;
DROP POLICY IF EXISTS "Students can update their own reading progress" ON student_books;
DROP POLICY IF EXISTS "Teachers can view their students' reading progress" ON student_books;

-- Create policies for students to manage their own progress
CREATE POLICY "Students can view their own reading progress"
  ON student_books
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own reading progress"
  ON student_books
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own reading progress"
  ON student_books
  FOR UPDATE
  USING (student_id = auth.uid());

-- Allow teachers and admins to view student progress
CREATE POLICY "Teachers can view their students' reading progress"
  ON student_books
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('TEACHER', 'ADMIN')
    )
  );

-- Verify policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'student_books'
ORDER BY policyname;

-- Test the policies (optional - run as different user roles)
-- As a student, you should be able to see your own progress:
-- SELECT * FROM student_books WHERE student_id = auth.uid();

-- Expected result after running this script:
-- - Students can read their own progress (dashboard shows books)
-- - Students can save progress when reading (upsert works)
-- - Teachers can view all student progress
-- - No more "No books in progress" error
