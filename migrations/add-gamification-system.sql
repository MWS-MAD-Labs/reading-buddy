-- =============================================
-- Reading Buddy - Gamification System Migration
-- Version: 1.4.0
-- Description: Adds XP, levels, streaks, and enhanced badge system
-- Run this in Supabase SQL Editor
-- =============================================

-- ============================================================================
-- PART 1: PROFILE GAMIFICATION FIELDS
-- ============================================================================

-- Add XP, level, and streak tracking to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS reading_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_read_date DATE,
ADD COLUMN IF NOT EXISTS total_books_completed INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pages_read INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_quizzes_completed INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_perfect_quizzes INTEGER NOT NULL DEFAULT 0;

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC) WHERE role = 'STUDENT';
CREATE INDEX IF NOT EXISTS idx_profiles_streak ON profiles(reading_streak DESC) WHERE role = 'STUDENT';
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC) WHERE role = 'STUDENT';

-- ============================================================================
-- PART 2: XP TRANSACTIONS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source VARCHAR(100) NOT NULL,
  source_id VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying student XP history
CREATE INDEX IF NOT EXISTS idx_xp_transactions_student ON xp_transactions(student_id, created_at DESC);

-- ============================================================================
-- PART 3: BADGE TIERS AND ENHANCEMENTS
-- ============================================================================

-- Add tier and XP reward to badges
ALTER TABLE badges
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Add constraint for tier values
ALTER TABLE badges
DROP CONSTRAINT IF EXISTS badges_tier_check;

ALTER TABLE badges
ADD CONSTRAINT badges_tier_check CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'special'));

-- Add constraint for category values
ALTER TABLE badges
DROP CONSTRAINT IF EXISTS badges_category_check;

ALTER TABLE badges
ADD CONSTRAINT badges_category_check CHECK (category IN ('reading', 'quiz', 'streak', 'milestone', 'special', 'general'));

-- ============================================================================
-- PART 4: READING CHALLENGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reading_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(50) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  goal_criteria JSONB NOT NULL,
  reward_xp INTEGER DEFAULT 0,
  reward_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT reading_challenges_type_check CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'event', 'custom'))
);

-- ============================================================================
-- PART 5: STUDENT CHALLENGE PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES reading_challenges(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_student_challenge UNIQUE(student_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_student_challenge_progress ON student_challenge_progress(student_id, completed);

-- ============================================================================
-- PART 6: UPDATE DEFAULT BADGES WITH TIERS AND XP
-- ============================================================================

-- Update existing badges with tiers and XP rewards
UPDATE badges SET tier = 'gold', xp_reward = 200, category = 'reading', display_order = 1
WHERE name = 'Checkpoint Champion';

UPDATE badges SET tier = 'gold', xp_reward = 250, category = 'quiz', display_order = 2
WHERE name = 'Quiz Master';

UPDATE badges SET tier = 'platinum', xp_reward = 100, category = 'quiz', display_order = 3
WHERE name = 'Perfect Score';

UPDATE badges SET tier = 'silver', xp_reward = 150, category = 'reading', display_order = 4
WHERE name = 'Book Finisher';

UPDATE badges SET tier = 'bronze', xp_reward = 75, category = 'streak', display_order = 5
WHERE name = 'Reading Streak';

UPDATE badges SET tier = 'bronze', xp_reward = 50, category = 'milestone', display_order = 6
WHERE name = 'First Book';

-- ============================================================================
-- PART 7: ADD MORE BADGES
-- ============================================================================

-- Reading milestone badges
INSERT INTO badges (name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order)
VALUES
  ('Bookworm', 'Complete 5 books', NULL, 'book_completion', '{"type": "books_completed", "count": 5}', 'silver', 100, 'milestone', 10),
  ('Super Reader', 'Complete 10 books', NULL, 'book_completion', '{"type": "books_completed", "count": 10}', 'gold', 200, 'milestone', 11),
  ('Reading Champion', 'Complete 25 books', NULL, 'book_completion', '{"type": "books_completed", "count": 25}', 'platinum', 500, 'milestone', 12),
  ('Library Legend', 'Complete 50 books', NULL, 'book_completion', '{"type": "books_completed", "count": 50}', 'special', 1000, 'milestone', 13)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  tier = EXCLUDED.tier,
  xp_reward = EXCLUDED.xp_reward,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;

-- Page milestone badges
INSERT INTO badges (name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order)
VALUES
  ('Page Turner', 'Read 100 pages', NULL, 'custom', '{"type": "pages_read", "count": 100}', 'bronze', 25, 'reading', 20),
  ('Avid Reader', 'Read 500 pages', NULL, 'custom', '{"type": "pages_read", "count": 500}', 'silver', 75, 'reading', 21),
  ('Page Master', 'Read 1000 pages', NULL, 'custom', '{"type": "pages_read", "count": 1000}', 'gold', 150, 'reading', 22),
  ('Marathon Reader', 'Read 5000 pages', NULL, 'custom', '{"type": "pages_read", "count": 5000}', 'platinum', 400, 'reading', 23)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  tier = EXCLUDED.tier,
  xp_reward = EXCLUDED.xp_reward,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;

-- Streak badges
INSERT INTO badges (name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order)
VALUES
  ('Consistent Reader', 'Read for 14 consecutive days', NULL, 'streak', '{"type": "reading_streak", "days": 14}', 'silver', 150, 'streak', 30),
  ('Month of Reading', 'Read for 30 consecutive days', NULL, 'streak', '{"type": "reading_streak", "days": 30}', 'gold', 300, 'streak', 31),
  ('Reading Warrior', 'Read for 60 consecutive days', NULL, 'streak', '{"type": "reading_streak", "days": 60}', 'platinum', 600, 'streak', 32),
  ('Ultimate Dedication', 'Read for 100 consecutive days', NULL, 'streak', '{"type": "reading_streak", "days": 100}', 'special', 1000, 'streak', 33)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  tier = EXCLUDED.tier,
  xp_reward = EXCLUDED.xp_reward,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;

-- Quiz badges
INSERT INTO badges (name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order)
VALUES
  ('Quiz Beginner', 'Complete your first quiz', NULL, 'quiz_mastery', '{"type": "quizzes_completed", "count": 1}', 'bronze', 25, 'quiz', 40),
  ('Quiz Enthusiast', 'Complete 10 quizzes', NULL, 'quiz_mastery', '{"type": "quizzes_completed", "count": 10}', 'silver', 100, 'quiz', 41),
  ('Quiz Expert', 'Complete 25 quizzes', NULL, 'quiz_mastery', '{"type": "quizzes_completed", "count": 25}', 'gold', 200, 'quiz', 42),
  ('Quiz Legend', 'Complete 50 quizzes', NULL, 'quiz_mastery', '{"type": "quizzes_completed", "count": 50}', 'platinum', 400, 'quiz', 43),
  ('Perfect Streak', 'Get 100% on 3 quizzes in a row', NULL, 'quiz_mastery', '{"type": "perfect_streak", "count": 3}', 'gold', 200, 'quiz', 44),
  ('High Achiever', 'Score 90%+ on 10 quizzes', NULL, 'quiz_mastery', '{"type": "high_scores", "minScore": 90, "count": 10}', 'gold', 250, 'quiz', 45)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  tier = EXCLUDED.tier,
  xp_reward = EXCLUDED.xp_reward,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;

-- Special achievement badges
INSERT INTO badges (name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order)
VALUES
  ('Early Bird', 'Read before 7 AM', NULL, 'custom', '{"type": "reading_time", "before": "07:00"}', 'bronze', 25, 'special', 50),
  ('Night Owl', 'Read after 9 PM', NULL, 'custom', '{"type": "reading_time", "after": "21:00"}', 'bronze', 25, 'special', 51),
  ('Weekend Warrior', 'Read on both Saturday and Sunday', NULL, 'custom', '{"type": "weekend_reading"}', 'bronze', 50, 'special', 52),
  ('Speed Reader', 'Complete a book in one day', NULL, 'custom', '{"type": "book_in_day"}', 'silver', 100, 'special', 53),
  ('Genre Explorer', 'Read books from 5 different genres', NULL, 'custom', '{"type": "genres_read", "count": 5}', 'silver', 100, 'special', 54)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  criteria = EXCLUDED.criteria,
  tier = EXCLUDED.tier,
  xp_reward = EXCLUDED.xp_reward,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- PART 8: RLS POLICIES
-- ============================================================================

-- XP Transactions policies
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own XP transactions"
  ON xp_transactions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "System can insert XP transactions"
  ON xp_transactions FOR INSERT
  WITH CHECK (true);

-- Reading challenges policies
ALTER TABLE reading_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON reading_challenges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Teachers and admins can manage challenges"
  ON reading_challenges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('TEACHER', 'LIBRARIAN', 'ADMIN')
    )
  );

-- Student challenge progress policies
ALTER TABLE student_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own challenge progress"
  ON student_challenge_progress FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can update their own challenge progress"
  ON student_challenge_progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can modify their own challenge progress"
  ON student_challenge_progress FOR UPDATE
  USING (auth.uid() = student_id);

-- ============================================================================
-- PART 9: HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Level thresholds: 0-99=1, 100-249=2, 250-499=3, 500-999=4, 1000-1749=5, etc.
  -- Formula: level = floor(sqrt(xp / 50)) + 1, capped at 100
  RETURN LEAST(FLOOR(SQRT(xp_amount::FLOAT / 50)) + 1, 100)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get XP required for next level
CREATE OR REPLACE FUNCTION xp_for_level(level_num INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Inverse of calculate_level formula
  RETURN ((level_num - 1) * (level_num - 1) * 50)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to award XP and update level
CREATE OR REPLACE FUNCTION award_xp(
  p_student_id UUID,
  p_amount INTEGER,
  p_source VARCHAR(100),
  p_source_id VARCHAR(255) DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, level_up BOOLEAN) AS $$
DECLARE
  v_old_xp INTEGER;
  v_old_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO v_old_xp, v_old_level
  FROM profiles WHERE id = p_student_id;

  -- Calculate new values
  v_new_xp := v_old_xp + p_amount;
  v_new_level := calculate_level(v_new_xp);

  -- Update profile
  UPDATE profiles
  SET xp = v_new_xp, level = v_new_level
  WHERE id = p_student_id;

  -- Record transaction
  INSERT INTO xp_transactions (student_id, amount, source, source_id, description)
  VALUES (p_student_id, p_amount, p_source, p_source_id, p_description);

  -- Return results
  RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_old_level);
END;
$$ LANGUAGE plpgsql;

-- Function to update reading streak
CREATE OR REPLACE FUNCTION update_reading_streak(p_student_id UUID)
RETURNS TABLE(current_streak INTEGER, is_new_streak BOOLEAN) AS $$
DECLARE
  v_last_read DATE;
  v_today DATE := CURRENT_DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_is_new BOOLEAN := false;
BEGIN
  -- Get current streak info
  SELECT last_read_date, reading_streak, longest_streak
  INTO v_last_read, v_current_streak, v_longest_streak
  FROM profiles WHERE id = p_student_id;

  -- Calculate new streak
  IF v_last_read IS NULL OR v_last_read < v_today - INTERVAL '1 day' THEN
    -- Streak broken or first read
    v_current_streak := 1;
    v_is_new := true;
  ELSIF v_last_read = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
    v_is_new := true;
  END IF;
  -- If v_last_read = v_today, streak stays the same (already read today)

  -- Update longest streak if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Update profile
  UPDATE profiles
  SET
    reading_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_read_date = v_today
  WHERE id = p_student_id;

  RETURN QUERY SELECT v_current_streak, v_is_new;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 10: MIGRATE DATA FROM LEGACY ACHIEVEMENTS TO BADGES
-- ============================================================================

-- Note: This migrates any existing student_achievements to student_badges
-- Only run this if you have data in student_achievements table

-- First, create a mapping of old achievement names to new badge names
-- This is a one-time migration step
DO $$
DECLARE
  v_achievement RECORD;
  v_badge_id UUID;
  v_student_achievement RECORD;
BEGIN
  -- For each unique achievement that has been earned
  FOR v_student_achievement IN
    SELECT DISTINCT sa.student_id, sa.earned_at, a.name as achievement_name
    FROM student_achievements sa
    JOIN achievements a ON sa.achievement_id = a.id
  LOOP
    -- Try to find matching badge
    SELECT id INTO v_badge_id
    FROM badges
    WHERE name = v_student_achievement.achievement_name
    LIMIT 1;

    -- If found and not already migrated, insert into student_badges
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO student_badges (student_id, badge_id, earned_at)
      VALUES (v_student_achievement.student_id, v_badge_id, v_student_achievement.earned_at)
      ON CONFLICT (student_id, badge_id, book_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================

-- Check profiles have new columns
-- SELECT id, full_name, xp, level, reading_streak, last_read_date FROM profiles LIMIT 5;

-- Check badges have new columns
-- SELECT name, tier, xp_reward, category FROM badges ORDER BY display_order;

-- Check XP functions work
-- SELECT calculate_level(0), calculate_level(100), calculate_level(500), calculate_level(1000);
-- SELECT xp_for_level(1), xp_for_level(2), xp_for_level(5), xp_for_level(10);
