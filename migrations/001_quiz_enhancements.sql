-- Migration: Quiz Feature Enhancements
-- Description: Add text extraction, page-range quizzes, checkpoints, and badges
-- Version: 001
-- Date: 2025-01-18

-- ============================================================================
-- PART 1: Books Table - Add Text Extraction Columns
-- ============================================================================

-- Add columns for storing extracted PDF text
ALTER TABLE books
ADD COLUMN IF NOT EXISTS page_text_content JSONB,
ADD COLUMN IF NOT EXISTS text_extracted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS text_extraction_method VARCHAR(50);

-- Add index for performance on text-extracted books
CREATE INDEX IF NOT EXISTS idx_books_text_extracted
ON books(text_extracted_at)
WHERE text_extracted_at IS NOT NULL;

-- Add comment explaining the JSONB structure
COMMENT ON COLUMN books.page_text_content IS
'Extracted text content from PDF in format:
{
  "pages": [{"pageNumber": 1, "text": "...", "wordCount": 245}],
  "totalPages": 150,
  "totalWords": 45000,
  "extractionMethod": "pdf-text"
}';


-- ============================================================================
-- PART 2: Quizzes Table - Add Page Range and Quiz Type
-- ============================================================================

-- Add columns for page-range based quizzes and quiz types
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS page_range_start INTEGER,
ADD COLUMN IF NOT EXISTS page_range_end INTEGER,
ADD COLUMN IF NOT EXISTS quiz_type VARCHAR(50) DEFAULT 'classroom',
ADD COLUMN IF NOT EXISTS checkpoint_page INTEGER;

-- Add constraint to ensure valid quiz types
ALTER TABLE quizzes
DROP CONSTRAINT IF EXISTS quizzes_quiz_type_check;

ALTER TABLE quizzes
ADD CONSTRAINT quizzes_quiz_type_check
CHECK (quiz_type IN ('checkpoint', 'classroom'));

-- Add indexes for quiz queries
CREATE INDEX IF NOT EXISTS idx_quizzes_type
ON quizzes(quiz_type);

CREATE INDEX IF NOT EXISTS idx_quizzes_checkpoint
ON quizzes(book_id, checkpoint_page)
WHERE quiz_type = 'checkpoint';

CREATE INDEX IF NOT EXISTS idx_quizzes_page_range
ON quizzes(book_id, page_range_start, page_range_end)
WHERE page_range_start IS NOT NULL;

-- Add comments
COMMENT ON COLUMN quizzes.quiz_type IS
'Type of quiz: "checkpoint" for in-reading quizzes that block progress, "classroom" for badge-based assessment quizzes';

COMMENT ON COLUMN quizzes.checkpoint_page IS
'For checkpoint quizzes: the page number where this quiz must be completed';


-- ============================================================================
-- PART 3: Quiz Checkpoints Table
-- ============================================================================

-- Track checkpoint definitions for books
CREATE TABLE IF NOT EXISTS quiz_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT unique_book_checkpoint UNIQUE(book_id, page_number)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_book
ON quiz_checkpoints(book_id, page_number);

CREATE INDEX IF NOT EXISTS idx_checkpoints_quiz
ON quiz_checkpoints(quiz_id);

-- Add comments
COMMENT ON TABLE quiz_checkpoints IS
'Defines checkpoint locations in books where students must complete quizzes';

COMMENT ON COLUMN quiz_checkpoints.is_required IS
'Whether students must complete this checkpoint to continue reading';


-- ============================================================================
-- PART 4: Student Checkpoint Progress Table
-- ============================================================================

-- Track student progress through checkpoints
CREATE TABLE IF NOT EXISTS student_checkpoint_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES quiz_checkpoints(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_score DECIMAL(5,2),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_student_checkpoint UNIQUE(student_id, checkpoint_id)
);

-- Add indexes for student progress queries
CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_student
ON student_checkpoint_progress(student_id, book_id);

CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_incomplete
ON student_checkpoint_progress(student_id, completed)
WHERE completed = false;

CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_checkpoint
ON student_checkpoint_progress(checkpoint_id);

-- Add comments
COMMENT ON TABLE student_checkpoint_progress IS
'Tracks individual student progress through reading checkpoints';

COMMENT ON COLUMN student_checkpoint_progress.attempts IS
'Number of times student has attempted this checkpoint quiz';


-- ============================================================================
-- PART 5: Badges Table
-- ============================================================================

-- Badge definitions
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_type VARCHAR(50) NOT NULL,
  criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_badge_name UNIQUE(name)
);

-- Add constraint for valid badge types
ALTER TABLE badges
DROP CONSTRAINT IF EXISTS badges_badge_type_check;

ALTER TABLE badges
ADD CONSTRAINT badges_badge_type_check
CHECK (badge_type IN ('checkpoint', 'quiz_mastery', 'book_completion', 'streak', 'custom'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_badges_type
ON badges(badge_type);

CREATE INDEX IF NOT EXISTS idx_badges_active
ON badges(is_active)
WHERE is_active = true;

-- Add comments
COMMENT ON TABLE badges IS
'Defines available badges/achievements that students can earn';

COMMENT ON COLUMN badges.criteria IS
'JSONB criteria for earning badge, e.g.:
{"type": "checkpoint_completion", "bookId": 123}
{"type": "quiz_score", "minScore": 90, "quizCount": 5}
{"type": "perfect_checkpoint", "bookId": 123}';


-- ============================================================================
-- PART 6: Student Badges Table
-- ============================================================================

-- Student badges earned
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  metadata JSONB,
  CONSTRAINT unique_student_badge_book UNIQUE(student_id, badge_id, book_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_student_badges_student
ON student_badges(student_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_badges_badge
ON student_badges(badge_id);

CREATE INDEX IF NOT EXISTS idx_student_badges_book
ON student_badges(book_id)
WHERE book_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE student_badges IS
'Tracks which badges each student has earned';

COMMENT ON COLUMN student_badges.metadata IS
'Additional context about how the badge was earned (e.g., score, date, specific achievement details)';


-- ============================================================================
-- PART 7: Insert Default Badges
-- ============================================================================

-- Insert default badge definitions
INSERT INTO badges (name, description, icon_url, badge_type, criteria) VALUES
(
  'Checkpoint Champion',
  'Complete all checkpoints in a book',
  '/badges/checkpoint-champion.svg',
  'checkpoint',
  '{"type": "checkpoint_completion", "description": "Complete all checkpoints in any book"}'::JSONB
),
(
  'Quiz Master',
  'Score 90% or higher on 5 quizzes',
  '/badges/quiz-master.svg',
  'quiz_mastery',
  '{"type": "quiz_score", "minScore": 90, "quizCount": 5, "description": "Score 90%+ on 5 quizzes"}'::JSONB
),
(
  'Perfect Score',
  'Get 100% on any quiz',
  '/badges/perfect-score.svg',
  'quiz_mastery',
  '{"type": "perfect_quiz", "description": "Score 100% on any quiz"}'::JSONB
),
(
  'Book Finisher',
  'Complete a book with all its checkpoints',
  '/badges/book-finisher.svg',
  'book_completion',
  '{"type": "book_with_checkpoints", "description": "Finish reading a book and complete all its checkpoints"}'::JSONB
),
(
  'Reading Streak',
  'Read for 7 days in a row',
  '/badges/reading-streak.svg',
  'streak',
  '{"type": "reading_streak", "days": 7, "description": "Read for 7 consecutive days"}'::JSONB
),
(
  'First Book',
  'Complete your first book',
  '/badges/first-book.svg',
  'book_completion',
  '{"type": "books_completed", "count": 1, "description": "Complete your first book"}'::JSONB
)
ON CONFLICT (name) DO NOTHING;


-- ============================================================================
-- PART 8: Update Existing Data (Safe Migrations)
-- ============================================================================

-- Set default quiz_type for existing quizzes
UPDATE quizzes
SET quiz_type = 'classroom'
WHERE quiz_type IS NULL;

-- ============================================================================
-- PART 9: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE quiz_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_checkpoint_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;

-- Quiz Checkpoints: Librarians/Admins can manage, everyone can view
DROP POLICY IF EXISTS "Librarians and admins can manage checkpoints" ON quiz_checkpoints;
CREATE POLICY "Librarians and admins can manage checkpoints"
  ON quiz_checkpoints
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('LIBRARIAN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Everyone can view checkpoints" ON quiz_checkpoints;
CREATE POLICY "Everyone can view checkpoints"
  ON quiz_checkpoints
  FOR SELECT
  USING (true);

-- Student Checkpoint Progress: Students can view/update their own
DROP POLICY IF EXISTS "Students can view their own checkpoint progress" ON student_checkpoint_progress;
CREATE POLICY "Students can view their own checkpoint progress"
  ON student_checkpoint_progress
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert their own checkpoint progress" ON student_checkpoint_progress;
CREATE POLICY "Students can insert their own checkpoint progress"
  ON student_checkpoint_progress
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update their own checkpoint progress" ON student_checkpoint_progress;
CREATE POLICY "Students can update their own checkpoint progress"
  ON student_checkpoint_progress
  FOR UPDATE
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view their students' checkpoint progress" ON student_checkpoint_progress;
CREATE POLICY "Teachers can view their students' checkpoint progress"
  ON student_checkpoint_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('TEACHER', 'ADMIN')
    )
  );

-- Badges: Everyone can view, only admins can manage
DROP POLICY IF EXISTS "Everyone can view active badges" ON badges;
CREATE POLICY "Everyone can view active badges"
  ON badges
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage badges" ON badges;
CREATE POLICY "Admins can manage badges"
  ON badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Student Badges: Students can view their own, teachers can view their students'
DROP POLICY IF EXISTS "Students can view their own badges" ON student_badges;
CREATE POLICY "Students can view their own badges"
  ON student_badges
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "System can insert student badges" ON student_badges;
CREATE POLICY "System can insert student badges"
  ON student_badges
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Teachers and admins can view all student badges" ON student_badges;
CREATE POLICY "Teachers and admins can view all student badges"
  ON student_badges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('TEACHER', 'ADMIN')
    )
  );


-- ============================================================================
-- PART 10: Triggers for Updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to student_checkpoint_progress
DROP TRIGGER IF EXISTS update_student_checkpoint_progress_updated_at ON student_checkpoint_progress;
CREATE TRIGGER update_student_checkpoint_progress_updated_at
  BEFORE UPDATE ON student_checkpoint_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to badges
DROP TRIGGER IF EXISTS update_badges_updated_at ON badges;
CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_quiz_enhancements.sql completed successfully';
  RAISE NOTICE 'Added: text extraction columns, quiz types, checkpoints, badges';
END $$;
