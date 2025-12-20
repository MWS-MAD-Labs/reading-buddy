-- ==========================================
-- Reading Buddy Database Triggers
-- Self-Hosted Version
-- ==========================================

-- ============================================================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Trigger for profiles table
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for student_checkpoint_progress table
CREATE TRIGGER update_student_checkpoint_progress_updated_at
  BEFORE UPDATE ON student_checkpoint_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for badges table
CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for student_books table
CREATE TRIGGER update_student_books_updated_at
  BEFORE UPDATE ON student_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TRIGGER update_profiles_updated_at ON profiles IS 'Auto-update updated_at on profile changes';
COMMENT ON TRIGGER update_student_checkpoint_progress_updated_at ON student_checkpoint_progress IS 'Auto-update updated_at on checkpoint progress changes';
COMMENT ON TRIGGER update_badges_updated_at ON badges IS 'Auto-update updated_at on badge changes';
COMMENT ON TRIGGER update_student_books_updated_at ON student_books IS 'Auto-update updated_at on reading progress changes';
