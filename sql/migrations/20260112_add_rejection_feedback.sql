-- =============================================
-- Book Reviews - Add Rejection Feedback
-- Version: 1.0.1
-- Description: Add rejection feedback column and update policies for resubmission
-- =============================================

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

-- Add rejection feedback column
ALTER TABLE book_reviews ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;

-- Update RLS policy to allow users to update their own REJECTED reviews (for resubmission)
-- First drop the existing policy, then recreate it
DROP POLICY IF EXISTS "Update own review for resubmission" ON book_reviews;

-- Allow users to update their own pending OR rejected reviews
CREATE POLICY "Update own review for resubmission" ON book_reviews FOR UPDATE
  USING (student_id = get_current_profile_id() AND status IN ('PENDING', 'REJECTED'));
