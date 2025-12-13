-- Add updated_at column to student_books table
-- This will track when a student last read a book, enabling proper sorting of "most recently read"

-- Add the column with default value of NOW() for existing records
ALTER TABLE student_books
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing records to set updated_at to started_at (best guess for migration)
UPDATE student_books
SET updated_at = COALESCE(completed_at, started_at)
WHERE updated_at IS NULL;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_student_books_updated_at
  BEFORE UPDATE ON student_books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Note: The update_updated_at_column() function should already exist in your database
-- If it doesn't, create it first:
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
