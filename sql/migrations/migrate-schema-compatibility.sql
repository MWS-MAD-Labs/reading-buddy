-- Add missing columns to local PostgreSQL schema for Supabase data compatibility

-- Books table additions
ALTER TABLE books ADD COLUMN IF NOT EXISTS original_file_format VARCHAR(20);
ALTER TABLE books ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS original_file_size BIGINT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS conversion_status VARCHAR(50);
ALTER TABLE books ADD COLUMN IF NOT EXISTS conversion_started_at TIMESTAMPTZ;
ALTER TABLE books ADD COLUMN IF NOT EXISTS conversion_completed_at TIMESTAMPTZ;
ALTER TABLE books ADD COLUMN IF NOT EXISTS conversion_error TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS original_format VARCHAR(20);
ALTER TABLE books ADD COLUMN IF NOT EXISTS converted_from_format VARCHAR(20);
ALTER TABLE books ADD COLUMN IF NOT EXISTS ebook_format VARCHAR(20);
ALTER TABLE books ADD COLUMN IF NOT EXISTS ebook_file_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS requires_conversion BOOLEAN DEFAULT FALSE;
ALTER TABLE books ADD COLUMN IF NOT EXISTS converted_epub_url TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS converted_pdf_url TEXT;

-- Quizzes table additions
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT TRUE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create class_quiz_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS class_quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, quiz_id)
);

-- Add RLS policies for class_quiz_assignments
ALTER TABLE class_quiz_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_quiz_assignments_select" ON class_quiz_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_quiz_assignments.class_id
      AND (
        classes.teacher_id = (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true)::uuid)
        OR (SELECT role FROM profiles WHERE user_id = current_setting('app.user_id', true)::uuid) = 'ADMIN'
      )
    )
  );

CREATE POLICY "class_quiz_assignments_insert" ON class_quiz_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_quiz_assignments.class_id
      AND (
        classes.teacher_id = (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true)::uuid)
        OR (SELECT role FROM profiles WHERE user_id = current_setting('app.user_id', true)::uuid) = 'ADMIN'
      )
    )
  );

CREATE POLICY "class_quiz_assignments_update" ON class_quiz_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_quiz_assignments.class_id
      AND (
        classes.teacher_id = (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true)::uuid)
        OR (SELECT role FROM profiles WHERE user_id = current_setting('app.user_id', true)::uuid) = 'ADMIN'
      )
    )
  );

CREATE POLICY "class_quiz_assignments_delete" ON class_quiz_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_quiz_assignments.class_id
      AND (
        classes.teacher_id = (SELECT id FROM profiles WHERE user_id = current_setting('app.user_id', true)::uuid)
        OR (SELECT role FROM profiles WHERE user_id = current_setting('app.user_id', true)::uuid) = 'ADMIN'
      )
    )
  );
