-- Add is_picture_book flag to books table
-- This flag indicates whether a book should use image-based rendering
-- (for picture books with illustrations) rather than text extraction
ALTER TABLE books ADD COLUMN IF NOT EXISTS is_picture_book BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN books.is_picture_book IS 'Picture books render each page as an image for optimal viewing of illustrations';
