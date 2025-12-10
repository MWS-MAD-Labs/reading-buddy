-- Create table to track completed weekly challenges
CREATE TABLE IF NOT EXISTS weekly_challenge_completions (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id VARCHAR(50) NOT NULL,
  week_number INT NOT NULL,
  year INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_awarded INT NOT NULL,
  UNIQUE(student_id, challenge_id, week_number, year)
);

-- Index for faster lookups
CREATE INDEX idx_weekly_challenge_completions_student ON weekly_challenge_completions(student_id);
CREATE INDEX idx_weekly_challenge_completions_week ON weekly_challenge_completions(week_number, year);

-- RLS policies
ALTER TABLE weekly_challenge_completions ENABLE ROW LEVEL SECURITY;

-- Students can view their own completions
CREATE POLICY "Students can view their own challenge completions"
ON weekly_challenge_completions
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Only service role can insert completions (via server actions)
CREATE POLICY "Service role can insert challenge completions"
ON weekly_challenge_completions
FOR INSERT
TO service_role
WITH CHECK (true);
