-- ==========================================
-- Reading Buddy Seed Data
-- Self-Hosted Version
-- Optional default badges and achievements
-- ==========================================

-- Note: This file is optional and provides default gamification data
-- You can customize or skip this based on your needs

-- ============================================================================
-- DEFAULT BADGES
-- ============================================================================

-- Reading Badges
INSERT INTO badges (id, name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Page Turner', 'Read 10 pages', '/badges/page-turner.svg', 'custom', '{"pages": 10}'::jsonb, 'bronze', 25, 'reading', 1, true),
  (gen_random_uuid(), 'Avid Reader', 'Read 50 pages', '/badges/avid-reader.svg', 'custom', '{"pages": 50}'::jsonb, 'silver', 75, 'reading', 2, true),
  (gen_random_uuid(), 'Page Master', 'Read 100 pages', '/badges/page-master.svg', 'custom', '{"pages": 100}'::jsonb, 'gold', 150, 'reading', 3, true),
  (gen_random_uuid(), 'Marathon Reader', 'Read 500 pages', '/badges/marathon-reader.svg', 'custom', '{"pages": 500}'::jsonb, 'platinum', 500, 'reading', 4, true)
ON CONFLICT (name) DO NOTHING;

-- Book Completion Badges
INSERT INTO badges (id, name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order, is_active)
VALUES
  (gen_random_uuid(), 'First Book', 'Complete your first book', '/badges/first-book.svg', 'book_completion', '{"books": 1}'::jsonb, 'bronze', 100, 'milestone', 10, true),
  (gen_random_uuid(), 'Bookworm', 'Complete 5 books', '/badges/bookworm.svg', 'book_completion', '{"books": 5}'::jsonb, 'silver', 250, 'milestone', 11, true),
  (gen_random_uuid(), 'Super Reader', 'Complete 10 books', '/badges/super-reader.svg', 'book_completion', '{"books": 10}'::jsonb, 'gold', 500, 'milestone', 12, true),
  (gen_random_uuid(), 'Reading Champion', 'Complete 25 books', '/badges/reading-champion.svg', 'book_completion', '{"books": 25}'::jsonb, 'platinum', 1000, 'milestone', 13, true)
ON CONFLICT (name) DO NOTHING;

-- Quiz Badges
INSERT INTO badges (id, name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Quiz Beginner', 'Complete 1 quiz', '/badges/quiz-beginner.svg', 'quiz_mastery', '{"quizzes": 1}'::jsonb, 'bronze', 50, 'quiz', 20, true),
  (gen_random_uuid(), 'Quiz Expert', 'Complete 10 quizzes', '/badges/quiz-expert.svg', 'quiz_mastery', '{"quizzes": 10}'::jsonb, 'silver', 150, 'quiz', 21, true),
  (gen_random_uuid(), 'Perfect Score', 'Get 100% on a quiz', '/badges/perfect-score.svg', 'quiz_mastery', '{"perfect_scores": 1}'::jsonb, 'gold', 200, 'quiz', 22, true),
  (gen_random_uuid(), 'Quiz Master', 'Complete 25 quizzes', '/badges/quiz-master.svg', 'quiz_mastery', '{"quizzes": 25}'::jsonb, 'platinum', 600, 'quiz', 23, true)
ON CONFLICT (name) DO NOTHING;

-- Streak Badges
INSERT INTO badges (id, name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Reading Streak', '3-day reading streak', '/badges/reading-streak.svg', 'streak', '{"streak": 3}'::jsonb, 'bronze', 50, 'streak', 30, true),
  (gen_random_uuid(), 'Consistent Reader', '7-day reading streak', '/badges/consistent-reader.svg', 'streak', '{"streak": 7}'::jsonb, 'silver', 100, 'streak', 31, true),
  (gen_random_uuid(), 'Month of Reading', '30-day reading streak', '/badges/month-of-reading.svg', 'streak', '{"streak": 30}'::jsonb, 'gold', 300, 'streak', 32, true),
  (gen_random_uuid(), 'Unstoppable', '60-day reading streak', '/badges/unstoppable.svg', 'streak', '{"streak": 60}'::jsonb, 'platinum', 600, 'streak', 33, true)
ON CONFLICT (name) DO NOTHING;

-- Special Badges
INSERT INTO badges (id, name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Early Bird', 'Read before 8 AM', '/badges/early-bird.svg', 'custom', '{"time": "08:00"}'::jsonb, 'special', 50, 'special', 40, true),
  (gen_random_uuid(), 'Weekend Warrior', 'Read on Saturday and Sunday', '/badges/weekend-warrior.svg', 'custom', '{"weekend": true}'::jsonb, 'special', 100, 'special', 41, true),
  (gen_random_uuid(), 'Speed Reader', 'Read 50 pages in one day', '/badges/speed-reader.svg', 'custom', '{"pages_per_day": 50}'::jsonb, 'special', 150, 'special', 42, true)
ON CONFLICT (name) DO NOTHING;

-- Checkpoint Badge
INSERT INTO badges (id, name, description, icon_url, badge_type, criteria, tier, xp_reward, category, display_order, is_active)
VALUES
  (gen_random_uuid(), 'Checkpoint Champion', 'Complete 10 checkpoint quizzes', '/badges/checkpoint-champion.svg', 'checkpoint', '{"checkpoints": 10}'::jsonb, 'gold', 300, 'quiz', 24, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE badges IS 'Achievement badges available in the system';
COMMENT ON COLUMN badges.tier IS 'Badge tier: bronze, silver, gold, platinum, special';
COMMENT ON COLUMN badges.category IS 'Badge category for organization: reading, milestone, quiz, streak, special';
COMMENT ON COLUMN badges.display_order IS 'Order to display badges in UI';
