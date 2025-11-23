-- =============================================
-- Add MOBI/AZW Format Support
-- Description: Extend format support to include MOBI, AZW, and AZW3
-- =============================================

-- Update constraint to include MOBI/AZW formats
ALTER TABLE books
  DROP CONSTRAINT IF EXISTS books_file_format_check;

ALTER TABLE books
  ADD CONSTRAINT books_file_format_check
  CHECK (file_format IN ('pdf', 'epub', 'mobi', 'azw', 'azw3'));

-- Update column comment
COMMENT ON COLUMN books.file_format IS 'Original file format: pdf, epub, mobi, azw, azw3';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'MOBI/AZW Format Support Added!';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'Supported formats now include:';
  RAISE NOTICE '  - PDF (original support)';
  RAISE NOTICE '  - EPUB (existing support)';
  RAISE NOTICE '  - MOBI (NEW - Kindle format)';
  RAISE NOTICE '  - AZW (NEW - Amazon Kindle)';
  RAISE NOTICE '  - AZW3 (NEW - Kindle KF8)';
  RAISE NOTICE '=============================================';
  RAISE NOTICE 'All formats will be converted to PDF using Calibre';
  RAISE NOTICE '=============================================';
END $$;
