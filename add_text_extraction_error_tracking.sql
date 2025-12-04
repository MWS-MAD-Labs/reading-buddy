-- =============================================
-- Text Extraction Error Tracking Migration
-- Run this in Supabase SQL Editor
-- =============================================

-- Add error tracking columns to books table
ALTER TABLE books
ADD COLUMN IF NOT EXISTS text_extraction_error TEXT,
ADD COLUMN IF NOT EXISTS text_extraction_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_extraction_attempt_at TIMESTAMP WITH TIME ZONE;

-- Create index for monitoring failed extractions
CREATE INDEX IF NOT EXISTS idx_books_extraction_failed
ON books(text_extraction_error)
WHERE text_extraction_error IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN books.text_extraction_error IS
'Last error message if text extraction failed. NULL if extraction succeeded or has not been attempted.';

COMMENT ON COLUMN books.text_extraction_attempts IS
'Number of times text extraction has been attempted for this book. Useful for monitoring and debugging.';

COMMENT ON COLUMN books.last_extraction_attempt_at IS
'Timestamp of the most recent extraction attempt (successful or failed). Used to track retry history.';

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Text Extraction Error Tracking Migration Complete!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  - text_extraction_error (TEXT)';
  RAISE NOTICE '  - text_extraction_attempts (INTEGER)';
  RAISE NOTICE '  - last_extraction_attempt_at (TIMESTAMP)';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Added index: idx_books_extraction_failed';
  RAISE NOTICE '=================================================';
END $$;
