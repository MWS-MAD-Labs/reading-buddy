-- =============================================
-- Reading Buddy - Book-Specific Badges Migration
-- Version: 1.4.1
-- Description: Adds support for book-specific badges and badge management
-- Run this in Supabase SQL Editor
-- =============================================

-- ============================================================================
-- PART 1: ADD BOOK REFERENCE TO BADGES TABLE
-- ============================================================================

-- Add book_id column to badges for book-specific badges
ALTER TABLE badges
ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES books(id) ON DELETE CASCADE;

-- Add created_by column to track who created the badge
ALTER TABLE badges
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for book-specific badge lookups
CREATE INDEX IF NOT EXISTS idx_badges_book_id ON badges(book_id) WHERE book_id IS NOT NULL;

-- ============================================================================
-- PART 2: UPDATE BADGE TYPE CONSTRAINT
-- ============================================================================

-- Drop old constraint and add new one with book_completion_specific type
ALTER TABLE badges
DROP CONSTRAINT IF EXISTS badges_badge_type_check;

ALTER TABLE badges
ADD CONSTRAINT badges_badge_type_check CHECK (
  badge_type IN (
    'checkpoint',
    'quiz_mastery',
    'book_completion',
    'book_completion_specific',  -- New: For specific book completion badges
    'streak',
    'custom'
  )
);

-- ============================================================================
-- PART 3: RLS POLICIES FOR BADGE MANAGEMENT
-- ============================================================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Admins and librarians can create badges" ON badges;
DROP POLICY IF EXISTS "Admins and librarians can update badges" ON badges;
DROP POLICY IF EXISTS "Admins and librarians can delete non-system badges" ON badges;
DROP POLICY IF EXISTS "Anyone can view active badges" ON badges;

-- Allow admins and librarians to create badges
CREATE POLICY "Admins and librarians can create badges"
  ON badges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
    )
  );

-- Allow admins and librarians to update badges
CREATE POLICY "Admins and librarians can update badges"
  ON badges FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
    )
  );

-- Allow admins and librarians to delete badges (except system badges)
CREATE POLICY "Admins and librarians can delete non-system badges"
  ON badges FOR DELETE
  USING (
    created_by IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
    )
  );

-- Everyone can read active badges
CREATE POLICY "Anyone can view active badges"
  ON badges FOR SELECT
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'LIBRARIAN')
  ));

-- ============================================================================
-- PART 4: HELPER FUNCTION FOR BOOK-SPECIFIC BADGE EVALUATION
-- ============================================================================

-- Function to check if a student has earned a book-specific badge
CREATE OR REPLACE FUNCTION check_book_specific_badge(
  p_student_id UUID,
  p_book_id INTEGER
)
RETURNS TABLE(badge_id UUID, badge_name TEXT, already_earned BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id as badge_id,
    b.name as badge_name,
    EXISTS(
      SELECT 1 FROM student_badges sb
      WHERE sb.student_id = p_student_id
        AND sb.badge_id = b.id
        AND sb.book_id = p_book_id
    ) as already_earned
  FROM badges b
  WHERE b.book_id = p_book_id
    AND b.badge_type = 'book_completion_specific'
    AND b.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: SAMPLE BOOK-SPECIFIC BADGE (Example - can be removed)
-- ============================================================================

-- This is just an example of how book-specific badges work
-- Actual badges will be created through the admin UI
-- INSERT INTO badges (name, description, badge_type, criteria, tier, xp_reward, category, book_id)
-- VALUES (
--   'Finished "Example Book"',
--   'Completed reading Example Book',
--   'book_completion_specific',
--   '{"type": "book_completion_specific"}',
--   'gold',
--   150,
--   'reading',
--   1  -- Replace with actual book_id
-- );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check badges table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'badges';

-- Check book-specific badges
-- SELECT b.name, b.badge_type, bk.title as book_title
-- FROM badges b
-- LEFT JOIN books bk ON b.book_id = bk.id
-- WHERE b.book_id IS NOT NULL;
