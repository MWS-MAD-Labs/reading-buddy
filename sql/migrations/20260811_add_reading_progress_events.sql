CREATE TABLE IF NOT EXISTS reading_progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  previous_page INTEGER,
  current_page INTEGER NOT NULL,
  source VARCHAR(30) NOT NULL,
  pages_advanced INTEGER NOT NULL DEFAULT 0,
  rewarded_pages INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  reward_status VARCHAR(30) NOT NULL DEFAULT 'not_applicable',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reading_progress_events_source_check
    CHECK (source IN ('digital_reader', 'manual_physical')),
  CONSTRAINT reading_progress_events_pages_check
    CHECK (pages_advanced >= 0 AND rewarded_pages >= 0 AND rewarded_pages <= pages_advanced),
  CONSTRAINT reading_progress_events_xp_check
    CHECK (xp_awarded >= 0),
  CONSTRAINT reading_progress_events_reward_status_check
    CHECK (reward_status IN ('awarded', 'daily_cap_reached', 'already_rewarded', 'not_applicable'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_transactions_manual_source_id
  ON xp_transactions(student_id, source_id)
  WHERE source = 'manual_page_read';

CREATE INDEX IF NOT EXISTS idx_reading_progress_events_student_created
  ON reading_progress_events(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_progress_events_book_created
  ON reading_progress_events(book_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reading_progress_events_manual_daily_rewards
  ON reading_progress_events(student_id, created_at)
  WHERE source = 'manual_physical' AND rewarded_pages > 0;

ALTER TABLE reading_progress_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'reading_progress_events'
      AND policyname = 'reading_progress_events_select_own'
  ) THEN
    CREATE POLICY "reading_progress_events_select_own"
      ON reading_progress_events FOR SELECT
      USING (student_id = get_current_profile_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'reading_progress_events'
      AND policyname = 'reading_progress_events_select_staff'
  ) THEN
    CREATE POLICY "reading_progress_events_select_staff"
      ON reading_progress_events FOR SELECT
      USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'reading_progress_events'
      AND policyname = 'reading_progress_events_insert_own'
  ) THEN
    CREATE POLICY "reading_progress_events_insert_own"
      ON reading_progress_events FOR INSERT
      WITH CHECK (student_id = get_current_profile_id());
  END IF;
END $$;
