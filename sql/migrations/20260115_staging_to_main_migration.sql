-- =============================================
-- Staging to Main Migration
-- Date: 2026-01-15
-- Description: Consolidated migration for all new features from staging branch
-- Features: Book Reviews, Journal Tables, Classroom Discussion Stream
-- =============================================

-- ============================================================================
-- PREREQUISITE: Ensure update_updated_at_column function exists
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. JOURNAL TABLES
-- ============================================================================

-- Journal entries (the master diary)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_type VARCHAR(50) NOT NULL,
  content TEXT,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  page_number INTEGER,
  page_range_start INTEGER,
  page_range_end INTEGER,
  reading_duration_minutes INTEGER,
  metadata JSONB DEFAULT '{}',
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT journal_entries_type_check CHECK (
    entry_type IN ('note', 'reading_session', 'achievement', 'quote', 'question', 'started_book', 'finished_book')
  )
);

-- Book-specific journal settings/data
CREATE TABLE IF NOT EXISTS book_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  personal_rating INTEGER CHECK (personal_rating >= 1 AND personal_rating <= 5),
  review_text TEXT,
  favorite_quote TEXT,
  favorite_quote_page INTEGER,
  reading_goal_pages INTEGER,
  notes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(student_id, book_id)
);

-- Indexes for journal tables
CREATE INDEX IF NOT EXISTS idx_journal_entries_student 
  ON journal_entries(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_book 
  ON journal_entries(book_id, student_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_type 
  ON journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date 
  ON journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_book_journals_student 
  ON book_journals(student_id);
CREATE INDEX IF NOT EXISTS idx_book_journals_book 
  ON book_journals(book_id);

-- Triggers for journal tables
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_book_journals_updated_at ON book_journals;
CREATE TRIGGER update_book_journals_updated_at
  BEFORE UPDATE ON book_journals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. BOOK REVIEWS SYSTEM
-- ============================================================================

-- Book reviews table
CREATE TABLE IF NOT EXISTS book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (char_length(comment) >= 10),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  rejection_feedback TEXT,
  moderated_by UUID REFERENCES profiles(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, student_id),
  CONSTRAINT book_reviews_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Review helpful votes (thumbs up)
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES book_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- Indexes for book reviews
CREATE INDEX IF NOT EXISTS idx_book_reviews_book ON book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_status ON book_reviews(status);
CREATE INDEX IF NOT EXISTS idx_book_reviews_pending ON book_reviews(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_book_reviews_student ON book_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);

-- Trigger for book reviews
DROP TRIGGER IF EXISTS update_book_reviews_updated_at ON book_reviews;
CREATE TRIGGER update_book_reviews_updated_at
  BEFORE UPDATE ON book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. CLASSROOM DISCUSSION STREAM
-- ============================================================================

-- Classroom messages table with threading support
CREATE TABLE IF NOT EXISTS classroom_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES classroom_messages(id) ON DELETE CASCADE,
  attachments JSONB DEFAULT '[]',  -- [{ type: 'note', noteId: '...', bookTitle: '...' }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for classroom messages
CREATE INDEX IF NOT EXISTS idx_classroom_messages_class ON classroom_messages(class_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_parent ON classroom_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_author ON classroom_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_created ON classroom_messages(class_id, created_at DESC);

-- Trigger for classroom messages
DROP TRIGGER IF EXISTS update_classroom_messages_updated_at ON classroom_messages;
CREATE TRIGGER update_classroom_messages_updated_at
  BEFORE UPDATE ON classroom_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTE: RLS Policies are NOT included in this migration
-- The self-hosted setup uses application-level auth instead of Supabase auth
-- ============================================================================

-- Migration complete!
SELECT 'Migration 20260115_staging_to_main completed successfully' AS status;
