-- =============================================
-- Add Multi-Format E-book Support
-- Description: Add support for EPUB and other formats
-- =============================================

-- Add new columns for multi-format support
ALTER TABLE books
  ADD COLUMN IF NOT EXISTS file_format VARCHAR(20) DEFAULT 'pdf',
  ADD COLUMN IF NOT EXISTS original_file_url TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- Create index for format queries
CREATE INDEX IF NOT EXISTS idx_books_file_format ON books(file_format);

-- Add constraint for supported formats (starting with pdf and epub)
ALTER TABLE books
  DROP CONSTRAINT IF EXISTS books_file_format_check;

ALTER TABLE books
  ADD CONSTRAINT books_file_format_check
  CHECK (file_format IN ('pdf', 'epub'));

-- Backfill existing books with default values
UPDATE books
SET
  file_format = 'pdf',
  original_file_url = pdf_url
WHERE file_format IS NULL OR original_file_url IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN books.file_format IS 'Original file format: pdf, epub (more formats to be added)';
COMMENT ON COLUMN books.original_file_url IS 'URL to original uploaded file before conversion';
COMMENT ON COLUMN books.file_size_bytes IS 'Size of original file in bytes';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Multi-Format Support Migration Complete!';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  - file_format (pdf, epub)';
  RAISE NOTICE '  - original_file_url';
  RAISE NOTICE '  - file_size_bytes';
  RAISE NOTICE '=============================================';
END $$;
