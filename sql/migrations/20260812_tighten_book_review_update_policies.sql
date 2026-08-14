-- Prevent review owners from bypassing moderation through direct INSERTs or
-- UPDATEs. PostgreSQL combines permissive policies with OR, so remove every
-- historical owner/moderator policy name before installing the strict split.

ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_reviews_insert_own" ON book_reviews;
DROP POLICY IF EXISTS "Create own review" ON book_reviews;
DROP POLICY IF EXISTS "Users can create their own reviews" ON book_reviews;
DROP POLICY IF EXISTS "book_reviews_update_owner_or_moderator" ON book_reviews;
DROP POLICY IF EXISTS "book_reviews_update_own_unmoderated" ON book_reviews;
DROP POLICY IF EXISTS "book_reviews_update_moderator" ON book_reviews;
DROP POLICY IF EXISTS "Update own pending review" ON book_reviews;
DROP POLICY IF EXISTS "Update own review for resubmission" ON book_reviews;
DROP POLICY IF EXISTS "Moderators update reviews" ON book_reviews;

CREATE POLICY "book_reviews_insert_own"
  ON book_reviews FOR INSERT
  WITH CHECK (
    student_id = get_current_profile_id()
    AND status = 'PENDING'
    AND rejection_feedback IS NULL
    AND moderated_by IS NULL
    AND moderated_at IS NULL
  );

CREATE POLICY "book_reviews_update_own_unmoderated"
  ON book_reviews FOR UPDATE
  USING (
    student_id = get_current_profile_id()
    AND status IN ('PENDING', 'REJECTED')
  )
  WITH CHECK (
    student_id = get_current_profile_id()
    AND status = 'PENDING'
    AND rejection_feedback IS NULL
    AND moderated_by IS NULL
    AND moderated_at IS NULL
  );

CREATE POLICY "book_reviews_update_moderator"
  ON book_reviews FOR UPDATE
  USING (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'))
  WITH CHECK (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'));
