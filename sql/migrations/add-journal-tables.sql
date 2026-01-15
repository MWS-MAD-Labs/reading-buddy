-- =============================================
-- Reading Journal Feature - Database Migration
-- Version: 1.3.0
-- Description: Adds tables for journal entries and book journals
-- =============================================

-- ============================================================================
-- JOURNAL TABLES
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

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

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

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_book_journals_updated_at
  BEFORE UPDATE ON book_journals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_journals ENABLE ROW LEVEL SECURITY;

-- Journal Entries Policies

-- Students can view their own journal entries
CREATE POLICY "Students can view their own journal entries"
  ON journal_entries
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can insert their own journal entries
CREATE POLICY "Students can insert their own journal entries"
  ON journal_entries
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can update their own journal entries
CREATE POLICY "Students can update their own journal entries"
  ON journal_entries
  FOR UPDATE
  USING (student_id = auth.uid());

-- Students can delete their own journal entries
CREATE POLICY "Students can delete their own journal entries"
  ON journal_entries
  FOR DELETE
  USING (student_id = auth.uid());

-- Teachers can view their students' public journal entries
CREATE POLICY "Teachers can view students journal entries"
  ON journal_entries
  FOR SELECT
  USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('TEACHER', 'ADMIN')
    )
  );

-- Book Journals Policies

-- Students can view their own book journals
CREATE POLICY "Students can view their own book journals"
  ON book_journals
  FOR SELECT
  USING (student_id = auth.uid());

-- Students can insert their own book journals
CREATE POLICY "Students can insert their own book journals"
  ON book_journals
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Students can update their own book journals
CREATE POLICY "Students can update their own book journals"
  ON book_journals
  FOR UPDATE
  USING (student_id = auth.uid());

-- Students can delete their own book journals
CREATE POLICY "Students can delete their own book journals"
  ON book_journals
  FOR DELETE
  USING (student_id = auth.uid());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON book_journals TO authenticated;
