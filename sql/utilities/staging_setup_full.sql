-- ============================================================================
-- READING BUDDY - STAGING DEPLOYMENT SCRIPT (FULL)
-- ============================================================================
-- This script performs a COMPLETE reset and setup of the database.
-- WARNING: IT WILL WIPE ALL EXISTING DATA IN PUBLIC AND AUTH SCHEMAS.
-- ============================================================================

-- PART A: CLEAN SLATE
-- ----------------------------------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
CREATE SCHEMA public;
CREATE SCHEMA auth;

-- Grant permissions (assuming default user 'postgres' or current role)
GRANT ALL ON SCHEMA public TO public;

-- PART B: AUTH MOCK SETUP (Required for Self-Hosting Compatibility)
-- ----------------------------------------------------------------------------

-- 1. Create auth.users table (Mimics Supabase)
CREATE TABLE auth.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    encrypted_password TEXT,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    raw_user_meta_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Mock auth functions
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ 
    SELECT COALESCE(
        current_setting('request.jwt.claim.sub', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
    )::uuid 
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ 
    SELECT COALESCE(
        current_setting('request.jwt.claim.role', true),
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
        'anon'
    )::text 
$$;

-- 3. Create Supabase-style Roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- 4. Create public.users table (For NextAuth)
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    email_verified TIMESTAMP WITH TIME ZONE,
    image TEXT,
    password_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Sync Trigger (Public -> Auth)
CREATE OR REPLACE FUNCTION sync_user_to_auth() RETURNS TRIGGER AS $$ 
BEGIN 
    INSERT INTO auth.users (id, email) 
    VALUES (NEW.id, NEW.email) 
    ON CONFLICT (id) DO NOTHING; 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_users 
AFTER INSERT ON public.users 
FOR EACH ROW 
EXECUTE FUNCTION sync_user_to_auth();


-- PART C: MAIN DATABASE SCHEMA
-- ----------------------------------------------------------------------------
-- (Content from database-setup.sql)

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

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'STUDENT',
  full_name TEXT,
  grade INT,
  access_level book_access_level,
  points INT NOT NULL DEFAULT 0,
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books table
CREATE TABLE books (
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
  file_format VARCHAR(20) DEFAULT 'pdf',
  original_file_url TEXT,
  file_size_bytes BIGINT,
  page_text_content JSONB,
  text_extracted_at TIMESTAMP WITH TIME ZONE,
  text_extraction_method VARCHAR(50),
  text_extraction_error TEXT,
  text_extraction_attempts INTEGER DEFAULT 0,
  last_extraction_attempt_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book access levels
CREATE TABLE book_access (
  id SERIAL PRIMARY KEY,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  access_level book_access_level NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (book_id, access_level)
);

-- Classes table
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class students
CREATE TABLE class_students (
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

-- Class books
CREATE TABLE class_books (
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  book_id INT REFERENCES books(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  PRIMARY KEY (class_id, book_id)
);

-- Book render jobs
CREATE TABLE book_render_jobs (
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
CREATE TABLE student_books (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  current_page INT NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, book_id)
);

-- Quizzes table
CREATE TABLE quizzes (
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
CREATE TABLE quiz_attempts (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements definitions
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  badge_url TEXT NOT NULL,
  criteria JSONB
);

-- Student achievements
CREATE TABLE student_achievements (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, achievement_id)
);

-- CHECKPOINT AND BADGE TABLES

-- Quiz checkpoints
CREATE TABLE quiz_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT unique_book_checkpoint UNIQUE(book_id, page_number)
);

-- Student checkpoint progress
CREATE TABLE student_checkpoint_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES quiz_checkpoints(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_score DECIMAL(5,2),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_student_checkpoint UNIQUE(student_id, checkpoint_id)
);

-- Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_type VARCHAR(50) NOT NULL,
  criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_badge_name UNIQUE(name),
  CONSTRAINT badges_badge_type_check CHECK (badge_type IN ('checkpoint', 'quiz_mastery', 'book_completion', 'streak', 'custom'))
);

-- Student badges earned
CREATE TABLE student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  metadata JSONB,
  CONSTRAINT unique_student_badge_book UNIQUE(student_id, badge_id, book_id)
);

-- Login broadcasts
CREATE TABLE login_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'info',
  link_label TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weekly challenge completions
CREATE TABLE weekly_challenge_completions (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id VARCHAR(50) NOT NULL,
  week_number INT NOT NULL,
  year INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_awarded INT NOT NULL,
  UNIQUE(student_id, challenge_id, week_number, year)
);

-- INDEXES
CREATE INDEX idx_books_text_extracted ON books(text_extracted_at) WHERE text_extracted_at IS NOT NULL;
CREATE INDEX idx_books_extraction_failed ON books(text_extraction_error) WHERE text_extraction_error IS NOT NULL;
CREATE INDEX idx_books_file_format ON books(file_format);
CREATE INDEX idx_quizzes_type ON quizzes(quiz_type);
CREATE INDEX idx_quizzes_checkpoint ON quizzes(book_id, checkpoint_page) WHERE quiz_type = 'checkpoint';
CREATE INDEX idx_quizzes_page_range ON quizzes(book_id, page_range_start, page_range_end) WHERE page_range_start IS NOT NULL;
CREATE INDEX idx_checkpoints_book ON quiz_checkpoints(book_id, page_number);
CREATE INDEX idx_checkpoints_quiz ON quiz_checkpoints(quiz_id);
CREATE INDEX idx_checkpoint_progress_student ON student_checkpoint_progress(student_id, book_id);
CREATE INDEX idx_checkpoint_progress_incomplete ON student_checkpoint_progress(student_id, completed) WHERE completed = false;
CREATE INDEX idx_checkpoint_progress_checkpoint ON student_checkpoint_progress(checkpoint_id);
CREATE INDEX idx_badges_type ON badges(badge_type);
CREATE INDEX idx_badges_active ON badges(is_active) WHERE is_active = true;
CREATE INDEX idx_student_badges_student ON student_badges(student_id, earned_at DESC);
CREATE INDEX idx_student_badges_badge ON student_badges(badge_id);
CREATE INDEX idx_student_badges_book ON student_badges(book_id) WHERE book_id IS NOT NULL;
CREATE INDEX idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX idx_profiles_level ON profiles(level DESC);
CREATE INDEX idx_profiles_reading_streak ON profiles(reading_streak DESC);
CREATE INDEX idx_weekly_challenge_completions_student ON weekly_challenge_completions(student_id);
CREATE INDEX idx_weekly_challenge_completions_week ON weekly_challenge_completions(week_number, year);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  IF TG_OP != 'INSERT' THEN
    RAISE EXCEPTION 'handle_new_user can only be used in INSERT triggers';
  END IF;
  IF TG_TABLE_NAME != 'users' OR TG_TABLE_SCHEMA != 'auth' THEN
    RAISE EXCEPTION 'handle_new_user can only be used on auth.users table';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  END IF;
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    'STUDENT',
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_user_emails()
RETURNS TABLE (
  user_id uuid,
  email text
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Access denied: only administrators can view user emails';
  END IF;
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email::text as email
  FROM auth.users u;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- VIEWS
CREATE VIEW public.quiz_statistics AS
SELECT
  q.id,
  q.book_id,
  q.created_by_id,
  q.questions,
  q.page_range_start,
  q.page_range_end,
  q.quiz_type,
  q.checkpoint_page,
  q.created_at,
  COUNT(DISTINCT qa.id) AS total_attempts,
  COUNT(DISTINCT qa.student_id) AS unique_students,
  ROUND(AVG(qa.score), 2) AS average_score,
  MAX(qa.score) AS highest_score,
  MIN(qa.score) AS lowest_score,
  CASE
    WHEN COUNT(qa.id) = 0 THEN 'no_attempts'
    WHEN AVG(qa.score) >= 80 THEN 'high_performance'
    WHEN AVG(qa.score) >= 60 THEN 'moderate_performance'
    ELSE 'needs_improvement'
  END AS performance_category,
  COUNT(DISTINCT CASE
    WHEN qa.submitted_at > NOW() - INTERVAL '7 days'
    THEN qa.id
  END) AS recent_attempts_7d,
  CASE
    WHEN jsonb_typeof(q.questions) = 'array' THEN jsonb_array_length(q.questions)
    WHEN jsonb_typeof(q.questions) = 'object' AND q.questions ? 'questions' THEN
      jsonb_array_length(q.questions->'questions')
    ELSE 0
  END AS question_count
FROM public.quizzes q
LEFT JOIN public.quiz_attempts qa ON q.id = qa.quiz_id
GROUP BY
  q.id,
  q.book_id,
  q.created_by_id,
  q.questions,
  q.page_range_start,
  q.page_range_end,
  q.quiz_type,
  q.checkpoint_page,
  q.created_at;

GRANT SELECT ON public.quiz_statistics TO authenticated;

-- TRIGGERS
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TRIGGER update_student_checkpoint_progress_updated_at
  BEFORE UPDATE ON student_checkpoint_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_books_updated_at
  BEFORE UPDATE ON student_books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Enable but skip complex policies for brevity in this manual script - mostly)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_checkpoint_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- PART D: POST-SETUP FIXES (Self-Housing adjustments)
-- ----------------------------------------------------------------------------

-- 1. Remove interference trigger (IMPORTANT for Admin assignment)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Add profile creation function used by NextAuth
CREATE OR REPLACE FUNCTION create_or_update_profile(
    _user_id UUID,
    _email TEXT,
    _full_name TEXT,
    _role user_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (_user_id, _full_name, _role)
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        role = CASE 
            WHEN profiles.role = 'ADMIN' THEN profiles.role -- Don't downgrade admins
            ELSE EXCLUDED.role
        END,
        updated_at = NOW();
END;
$$;

-- FINAL
COMMIT;
