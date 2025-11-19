-- Fix: Add RLS policies for quiz_attempts table
-- This fixes the issue where students cannot view their quiz attempts
-- Run this on your production database

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view their own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Students can insert their own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Teachers can view their students' quiz attempts" ON quiz_attempts;

-- Quiz attempts policies
CREATE POLICY "Students can view their own quiz attempts"
  ON quiz_attempts
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can insert their own quiz attempts"
  ON quiz_attempts
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Teachers can view their students' quiz attempts"
  ON quiz_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('TEACHER', 'ADMIN', 'LIBRARIAN')
    )
  );
