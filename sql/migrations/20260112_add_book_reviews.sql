-- =============================================
-- Book Rating System Migration
-- Version: 1.0.0
-- Description: Add book_reviews and review_votes tables
-- =============================================

-- Book reviews table
CREATE TABLE IF NOT EXISTS book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL CHECK (char_length(comment) >= 10),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_book_reviews_book ON book_reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_book_reviews_status ON book_reviews(status);
CREATE INDEX IF NOT EXISTS idx_book_reviews_pending ON book_reviews(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_book_reviews_student ON book_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);

-- Helper functions for RLS in self-hosted environment
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM profiles
  WHERE user_id = current_setting('app.user_id', TRUE)::UUID
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM profiles
  WHERE user_id = current_setting('app.user_id', TRUE)::UUID
  LIMIT 1;
$$;

-- Enable RLS
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to allow re-running
DROP POLICY IF EXISTS "View approved or own reviews" ON book_reviews;
DROP POLICY IF EXISTS "Create own review" ON book_reviews;
DROP POLICY IF EXISTS "Update own pending review" ON book_reviews;
DROP POLICY IF EXISTS "Moderators view all reviews" ON book_reviews;
DROP POLICY IF EXISTS "Moderators update reviews" ON book_reviews;
DROP POLICY IF EXISTS "View all votes" ON review_votes;
DROP POLICY IF EXISTS "Create own vote" ON review_votes;
DROP POLICY IF EXISTS "Delete own vote" ON review_votes;

-- RLS Policies for book_reviews
-- Anyone authenticated can read approved reviews or their own reviews
CREATE POLICY "View approved or own reviews" ON book_reviews FOR SELECT
  USING (status = 'APPROVED' OR student_id = get_current_profile_id());

-- Users can create their own reviews
CREATE POLICY "Create own review" ON book_reviews FOR INSERT
  WITH CHECK (student_id = get_current_profile_id());

-- Users can update their own pending reviews
CREATE POLICY "Update own pending review" ON book_reviews FOR UPDATE
  USING (student_id = get_current_profile_id() AND (status = 'PENDING' OR status = 'REJECTED'));

-- Librarians/admins can view all reviews (for moderation)
CREATE POLICY "Moderators view all reviews" ON book_reviews FOR SELECT
  USING (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'));

-- Librarians/admins can update reviews (for moderation)
CREATE POLICY "Moderators update reviews" ON book_reviews FOR UPDATE
  USING (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'));

-- RLS Policies for review_votes
-- Anyone can view votes
CREATE POLICY "View all votes" ON review_votes FOR SELECT
  USING (true);

-- Users can add their own votes
CREATE POLICY "Create own vote" ON review_votes FOR INSERT
  WITH CHECK (user_id = get_current_profile_id());

-- Users can delete their own votes
CREATE POLICY "Delete own vote" ON review_votes FOR DELETE
  USING (user_id = get_current_profile_id());

-- Trigger to update updated_at on book_reviews
CREATE TRIGGER update_book_reviews_updated_at
  BEFORE UPDATE ON book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
