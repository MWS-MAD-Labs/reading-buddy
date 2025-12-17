-- ==========================================
-- Reading Buddy Application Schema
-- Self-Hosted Version (adapted from Supabase)
-- ==========================================

-- ============================================================================
-- PART 1: ENUMS AND TYPES
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN');

-- Book access levels
CREATE TYPE book_access_level AS ENUM (
  'KINDERGARTEN',
  'LOWER_ELEMENTARY',
  'UPPER_ELEMENTARY',
  'JUNIOR_HIGH',
  'TEACHERS_STAFF'
);

-- Badge types
CREATE TYPE badge_type AS ENUM ('checkpoint', 'quiz_mastery', 'book_completion', 'streak', 'custom');

-- Quiz types
CREATE TYPE quiz_type AS ENUM ('checkpoint', 'classroom');

-- ============================================================================
-- PART 2: CORE TABLES
-- ============================================================================

-- Profiles table (now links to NextAuth users instead of auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role NOT NULL DEFAULT 'STUDENT',
  full_name TEXT,
  grade INT,
  access_level book_access_level,
  points INT NOT NULL DEFAULT 0,
  -- Gamification fields
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  reading_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_read_date DATE,
  total_books_completed INT NOT NULL DEFAULT 0,
  total_pages_read INT NOT NULL DEFAULT 0,
  total_quizzes_completed INT NOT NULL DEFAULT 0,
  total_perfect_quizzes INT NOT NULL DEFAULT 0,
  books_completed INT NOT NULL DEFAULT 0,
  pages_read INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT profiles_user_id_unique UNIQUE(user_id)
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  category TEXT,
  grade_level INT,
  page_count INT,
  pdf_url TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  isbn TEXT,
  publisher TEXT,
  publication_year INT,
  genre TEXT,
  language TEXT,
  page_images_prefix TEXT,
  page_images_count INT,
  page_images_rendered_at TIMESTAMPTZ,
  -- Multi-format support
  file_format VARCHAR(20) DEFAULT 'pdf',
  original_file_url TEXT,
  file_size_bytes BIGINT,
  -- Text extraction
  page_text_content JSONB,
  text_extracted_at TIMESTAMPTZ,
  text_extraction_method VARCHAR(50),
  text_extraction_error TEXT,
  text_extraction_attempts INTEGER DEFAULT 0,
  last_extraction_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book access levels
CREATE TABLE IF NOT EXISTS book_access (
  id SERIAL PRIMARY KEY,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  access_level book_access_level NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT book_access_unique UNIQUE (book_id, access_level)
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class students (many-to-many)
CREATE TABLE IF NOT EXISTS class_students (
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

-- Class books (many-to-many assignments)
CREATE TABLE IF NOT EXISTS class_books (
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  book_id INT REFERENCES books(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  PRIMARY KEY (class_id, book_id)
);

-- Book render jobs
CREATE TABLE IF NOT EXISTS book_render_jobs (
  id SERIAL PRIMARY KEY,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_pages INT,
  processed_pages INT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student reading progress
CREATE TABLE IF NOT EXISTS student_books (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  current_page INT NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT student_books_unique UNIQUE(student_id, book_id)
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES profiles(id),
  questions JSONB NOT NULL,
  page_range_start INTEGER,
  page_range_end INTEGER,
  quiz_type VARCHAR(50) DEFAULT 'classroom',
  checkpoint_page INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT quizzes_quiz_type_check CHECK (quiz_type IN ('checkpoint', 'classroom'))
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements definitions (legacy)
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  badge_url TEXT NOT NULL,
  criteria JSONB
);

-- Student achievements (earned - legacy)
CREATE TABLE IF NOT EXISTS student_achievements (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT student_achievements_unique UNIQUE(student_id, achievement_id)
);

-- Quiz checkpoints
CREATE TABLE IF NOT EXISTS quiz_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT unique_book_checkpoint UNIQUE(book_id, page_number)
);

-- Student checkpoint progress
CREATE TABLE IF NOT EXISTS student_checkpoint_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES quiz_checkpoints(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  quiz_score DECIMAL(5,2),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_checkpoint UNIQUE(student_id, checkpoint_id)
);

-- Badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_type VARCHAR(50) NOT NULL,
  criteria JSONB NOT NULL,
  tier VARCHAR(20) DEFAULT 'bronze',
  xp_reward INTEGER DEFAULT 0,
  category VARCHAR(50),
  display_order INTEGER,
  is_active BOOLEAN DEFAULT true,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_badge_name UNIQUE(name),
  CONSTRAINT badges_badge_type_check CHECK (badge_type IN ('checkpoint', 'quiz_mastery', 'book_completion', 'streak', 'custom'))
);

-- Student badges earned
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  metadata JSONB,
  CONSTRAINT unique_student_badge_book UNIQUE(student_id, badge_id, book_id)
);

-- XP transactions (audit trail)
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL,
  source_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading challenges
CREATE TABLE IF NOT EXISTS reading_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal_criteria JSONB NOT NULL,
  reward_xp INTEGER DEFAULT 0,
  reward_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT challenges_type_check CHECK (challenge_type IN ('daily', 'weekly', 'monthly', 'event', 'custom'))
);

-- Student challenge progress
CREATE TABLE IF NOT EXISTS student_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES reading_challenges(id) ON DELETE CASCADE,
  progress JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_student_challenge UNIQUE(student_id, challenge_id)
);

-- Login broadcasts
CREATE TABLE IF NOT EXISTS login_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'info',
  link_label TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly challenge completions
CREATE TABLE IF NOT EXISTS weekly_challenge_completions (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id VARCHAR(50) NOT NULL,
  week_number INT NOT NULL,
  year INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_awarded INT NOT NULL,
  CONSTRAINT weekly_challenge_unique UNIQUE(student_id, challenge_id, week_number, year)
);

-- ============================================================================
-- PART 3: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_reading_streak ON profiles(reading_streak DESC);

-- Books indexes
CREATE INDEX IF NOT EXISTS idx_books_text_extracted ON books(text_extracted_at) WHERE text_extracted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_extraction_failed ON books(text_extraction_error) WHERE text_extraction_error IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_books_file_format ON books(file_format);

-- Student books indexes
CREATE INDEX IF NOT EXISTS idx_student_books_student ON student_books(student_id);
CREATE INDEX IF NOT EXISTS idx_student_books_book ON student_books(book_id);

-- Quizzes indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_book ON quizzes(book_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_type ON quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_checkpoint ON quizzes(book_id, checkpoint_page) WHERE quiz_type = 'checkpoint';
CREATE INDEX IF NOT EXISTS idx_quizzes_page_range ON quizzes(book_id, page_range_start, page_range_end) WHERE page_range_start IS NOT NULL;

-- Quiz attempts indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- Quiz checkpoints indexes
CREATE INDEX IF NOT EXISTS idx_checkpoints_book ON quiz_checkpoints(book_id, page_number);
CREATE INDEX IF NOT EXISTS idx_checkpoints_quiz ON quiz_checkpoints(quiz_id);

-- Student checkpoint progress indexes
CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_student ON student_checkpoint_progress(student_id, book_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_incomplete ON student_checkpoint_progress(student_id, completed) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_checkpoint ON student_checkpoint_progress(checkpoint_id);

-- Badges indexes
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active) WHERE is_active = true;

-- Student badges indexes
CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_badges_badge ON student_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_book ON student_badges(book_id) WHERE book_id IS NOT NULL;

-- XP transactions indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_student ON xp_transactions(student_id, created_at DESC);

-- Challenge indexes
CREATE INDEX IF NOT EXISTS idx_challenges_active ON reading_challenges(is_active, end_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_student_challenge_progress_student ON student_challenge_progress(student_id);

-- Weekly challenge indexes
CREATE INDEX IF NOT EXISTS idx_weekly_challenge_completions_student ON weekly_challenge_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_weekly_challenge_completions_week ON weekly_challenge_completions(week_number, year);

-- ============================================================================
-- PART 4: COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles linked to NextAuth users table';
COMMENT ON COLUMN profiles.user_id IS 'Reference to NextAuth users.id';
COMMENT ON TABLE books IS 'Book catalog with multi-format support';
COMMENT ON TABLE student_books IS 'Student reading progress tracking';
COMMENT ON TABLE quizzes IS 'Quiz definitions for books';
COMMENT ON TABLE quiz_attempts IS 'Student quiz submissions and scores';
COMMENT ON TABLE badges IS 'Achievement badge definitions';
COMMENT ON TABLE student_badges IS 'Badges earned by students';
COMMENT ON TABLE xp_transactions IS 'XP transaction history for transparency';
