-- ==========================================
-- Reading Buddy Database Functions
-- Self-Hosted Version (adapted from Supabase)
-- ==========================================

-- ============================================================================
-- GAMIFICATION FUNCTIONS
-- ============================================================================

-- Calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Formula: level = floor(sqrt(xp / 50)) + 1, capped at 100
  RETURN LEAST(FLOOR(SQRT(xp_amount::FLOAT / 50)) + 1, 100);
END;
$$;

COMMENT ON FUNCTION calculate_level(INTEGER) IS 'Calculate user level from XP amount';

-- Calculate XP needed for a specific level
CREATE OR REPLACE FUNCTION xp_for_level(level_num INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Inverse of level formula: xp = 50 * (level - 1)^2
  RETURN 50 * POWER(level_num - 1, 2);
END;
$$;

COMMENT ON FUNCTION xp_for_level(INTEGER) IS 'Calculate XP required for specific level';

-- Award XP to student
CREATE OR REPLACE FUNCTION award_xp(
  p_student_id UUID,
  p_amount INTEGER,
  p_source VARCHAR(50),
  p_source_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, level_up BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_leveled_up BOOLEAN;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM profiles
  WHERE id = p_student_id;

  -- Calculate new XP and level
  v_new_xp := v_current_xp + p_amount;
  v_new_level := calculate_level(v_new_xp);
  v_leveled_up := v_new_level > v_current_level;

  -- Update profile
  UPDATE profiles
  SET xp = v_new_xp,
      level = v_new_level,
      updated_at = NOW()
  WHERE id = p_student_id;

  -- Record transaction
  INSERT INTO xp_transactions (student_id, amount, source, source_id, description)
  VALUES (p_student_id, p_amount, p_source, p_source_id, p_description);

  -- Return results
  RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up;
END;
$$;

COMMENT ON FUNCTION award_xp IS 'Award XP to student and update level';

-- Update reading streak
CREATE OR REPLACE FUNCTION update_reading_streak(p_student_id UUID)
RETURNS TABLE(current_streak INTEGER, is_new_streak BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_read_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
  v_is_new_streak BOOLEAN := FALSE;
BEGIN
  -- Get current streak data
  SELECT last_read_date, reading_streak, longest_streak
  INTO v_last_read_date, v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = p_student_id;

  -- Calculate new streak
  IF v_last_read_date IS NULL THEN
    -- First time reading
    v_current_streak := 1;
    v_is_new_streak := TRUE;
  ELSIF v_last_read_date = v_today THEN
    -- Already read today, no change
    v_is_new_streak := FALSE;
  ELSIF v_last_read_date = v_today - INTERVAL '1 day' THEN
    -- Read yesterday, continue streak
    v_current_streak := v_current_streak + 1;
    v_is_new_streak := TRUE;
  ELSE
    -- Streak broken, start over
    v_current_streak := 1;
    v_is_new_streak := TRUE;
  END IF;

  -- Update longest streak if necessary
  v_longest_streak := GREATEST(v_longest_streak, v_current_streak);

  -- Update profile
  UPDATE profiles
  SET reading_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_read_date = v_today,
      updated_at = NOW()
  WHERE id = p_student_id;

  -- Return results
  RETURN QUERY SELECT v_current_streak, v_is_new_streak;
END;
$$;

COMMENT ON FUNCTION update_reading_streak IS 'Update daily reading streak for student';

-- Check book-specific badges
CREATE OR REPLACE FUNCTION check_book_specific_badge(
  p_student_id UUID,
  p_book_id INTEGER
)
RETURNS TABLE(badge_id UUID, badge_name VARCHAR, already_earned BOOLEAN)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS badge_id,
    b.name AS badge_name,
    EXISTS(
      SELECT 1 FROM student_badges sb
      WHERE sb.student_id = p_student_id
        AND sb.badge_id = b.id
        AND sb.book_id = p_book_id
    ) AS already_earned
  FROM badges b
  WHERE b.book_id = p_book_id
    AND b.is_active = TRUE;
END;
$$;

COMMENT ON FUNCTION check_book_specific_badge IS 'Check if student has earned book-specific badges';

-- ============================================================================
-- PROFILE MANAGEMENT FUNCTIONS
-- ============================================================================

-- Create or update profile (called from NextAuth)
CREATE OR REPLACE FUNCTION create_or_update_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role user_role DEFAULT 'STUDENT'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Check if profile exists
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = p_user_id;

  IF v_profile_id IS NULL THEN
    -- Create new profile with specified role
    INSERT INTO profiles (
      user_id,
      email,
      full_name,
      role,
      access_level,
      xp,
      level,
      reading_streak,
      longest_streak
    ) VALUES (
      p_user_id,
      p_email,
      p_full_name,
      p_role,
      'LOWER_ELEMENTARY',
      0,
      1,
      0,
      0
    )
    RETURNING id INTO v_profile_id;
  ELSE
    -- Update existing profile (preserve existing role)
    UPDATE profiles
    SET email = p_email,
        full_name = COALESCE(p_full_name, full_name),
        updated_at = NOW()
    WHERE id = v_profile_id;
  END IF;

  RETURN v_profile_id;
END;
$$;

COMMENT ON FUNCTION create_or_update_profile IS 'Create or update user profile from NextAuth';

-- ============================================================================
-- ADMIN FUNCTIONS
-- ============================================================================

-- Get all user emails (admin only)
CREATE OR REPLACE FUNCTION get_all_user_emails()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requesting_user_role user_role;
BEGIN
  -- Get requesting user's role
  SELECT p.role INTO v_requesting_user_role
  FROM profiles p
  WHERE p.user_id = current_setting('app.user_id', TRUE)::UUID;

  -- Only ADMIN can execute
  IF v_requesting_user_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Access denied: only administrators can view user emails';
  END IF;

  -- Return user emails with roles
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.email AS email,
    COALESCE(p.role, 'STUDENT'::user_role) AS role
  FROM users u
  LEFT JOIN profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_all_user_emails IS 'Get all user emails (ADMIN only)';

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Automatically update updated_at timestamp';
