-- =============================================
-- Text-Based Reader Migration
-- Adds columns for text JSON storage and extraction status
-- =============================================

-- Add text JSON URL column to store reference to MinIO JSON file
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS text_json_url TEXT;

-- Add text extraction status for tracking migration progress
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS text_extraction_status VARCHAR(20) DEFAULT 'pending';
-- Values: pending, processing, completed, failed

-- Add comment for documentation
COMMENT ON COLUMN books.text_json_url IS 'URL to extracted text JSON stored in MinIO bucket (book-text/{bookId}/pages.json)';
COMMENT ON COLUMN books.text_extraction_status IS 'Status of text extraction: pending, processing, completed, failed';

-- Create index for filtering by extraction status
CREATE INDEX IF NOT EXISTS idx_books_text_extraction_status 
ON books(text_extraction_status);

-- Create index for books with text available
CREATE INDEX IF NOT EXISTS idx_books_text_available 
ON books(text_json_url) 
WHERE text_json_url IS NOT NULL;
