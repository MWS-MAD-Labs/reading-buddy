ALTER TABLE student_books
ADD COLUMN IF NOT EXISTS progress_source VARCHAR(30)
  NOT NULL DEFAULT 'digital_reader',
ADD COLUMN IF NOT EXISTS last_manual_sync_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_books_progress_source_check'
      AND conrelid = 'student_books'::regclass
  ) THEN
    ALTER TABLE student_books
      ADD CONSTRAINT student_books_progress_source_check
      CHECK (progress_source IN ('digital_reader', 'manual_physical'));
  END IF;
END $$;
