ALTER TABLE student_books
ADD COLUMN IF NOT EXISTS epub_cfi TEXT,
ADD COLUMN IF NOT EXISTS progress_percent NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_student_books_epub_cfi
ON student_books(student_id, book_id, epub_cfi);
