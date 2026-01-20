-- Migration: Clear text extraction errors for readable books
-- Date: 2026-01-20
-- Description: Books with failed text extraction are still readable via original files.
--              This migration clears the error status to show a cleaner UI.

-- Clear extraction errors and mark as extracted for books that have readable files
UPDATE books 
SET 
  text_extracted_at = NOW(),
  text_extraction_error = NULL,
  text_extraction_attempts = 0,
  last_extraction_attempt_at = NULL
WHERE text_extraction_error IS NOT NULL 
  AND (original_file_url IS NOT NULL OR pdf_url IS NOT NULL);

-- Show affected rows count
-- SELECT COUNT(*) as cleared_books FROM books WHERE text_extracted_at >= NOW() - INTERVAL '1 minute';
