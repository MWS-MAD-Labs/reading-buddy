-- ==========================================
-- Reading Buddy Row Level Security Policies
-- Self-Hosted Version (using session context)
-- ==========================================

-- Note: Self-hosted uses current_setting('app.user_id') instead of auth.uid()
-- The middleware sets this session variable for each request

-- ============================================================================
-- HELPER FUNCTION FOR RLS
-- ============================================================================

-- Get current user's profile ID from session
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM profiles
  WHERE user_id = current_setting('app.user_id', TRUE)::UUID
  LIMIT 1;
$$;

-- Get current user's role from session
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM profiles
  WHERE user_id = current_setting('app.user_id', TRUE)::UUID
  LIMIT 1;
$$;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

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
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenge_completions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (user_id = current_setting('app.user_id', TRUE)::UUID);

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (get_current_user_role() IN ('ADMIN', 'LIBRARIAN'));

-- ============================================================================
-- BOOKS POLICIES
-- ============================================================================

CREATE POLICY "books_select_authenticated"
  ON books FOR SELECT
  USING (current_setting('app.user_id', TRUE) IS NOT NULL);

CREATE POLICY "books_insert_librarian_admin"
  ON books FOR INSERT
  WITH CHECK (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'));

CREATE POLICY "books_update_librarian_admin"
  ON books FOR UPDATE
  USING (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'));

CREATE POLICY "books_delete_admin"
  ON books FOR DELETE
  USING (get_current_user_role() = 'ADMIN');

-- ============================================================================
-- BOOK ACCESS POLICIES
-- ============================================================================

CREATE POLICY "book_access_select_all"
  ON book_access FOR SELECT
  USING (true);

CREATE POLICY "book_access_manage_librarian_admin"
  ON book_access FOR ALL
  USING (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'));

-- ============================================================================
-- CLASSES POLICIES
-- ============================================================================

CREATE POLICY "classes_select_teacher_own"
  ON classes FOR SELECT
  USING (
    teacher_id = get_current_profile_id()
    OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN')
  );

CREATE POLICY "classes_select_student_enrolled"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students
      WHERE class_id = classes.id
      AND student_id = get_current_profile_id()
    )
  );

CREATE POLICY "classes_insert_teacher"
  ON classes FOR INSERT
  WITH CHECK (
    teacher_id = get_current_profile_id()
    AND get_current_user_role() IN ('TEACHER', 'ADMIN', 'LIBRARIAN')
  );

CREATE POLICY "classes_update_teacher_own"
  ON classes FOR UPDATE
  USING (
    teacher_id = get_current_profile_id()
    OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN')
  );

CREATE POLICY "classes_delete_teacher_own"
  ON classes FOR DELETE
  USING (
    teacher_id = get_current_profile_id()
    OR get_current_user_role() = 'ADMIN'
  );

-- ============================================================================
-- CLASS STUDENTS POLICIES
-- ============================================================================

CREATE POLICY "class_students_select_teacher"
  ON class_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
      AND (
        classes.teacher_id = get_current_profile_id()
        OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN')
      )
    )
  );

CREATE POLICY "class_students_select_own"
  ON class_students FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "class_students_manage_teacher"
  ON class_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
      AND (
        classes.teacher_id = get_current_profile_id()
        OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN')
      )
    )
  );

-- ============================================================================
-- CLASS BOOKS POLICIES
-- ============================================================================

CREATE POLICY "class_books_select_teacher"
  ON class_books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_books.class_id
      AND (
        classes.teacher_id = get_current_profile_id()
        OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN')
      )
    )
  );

CREATE POLICY "class_books_select_student"
  ON class_books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students
      WHERE class_students.class_id = class_books.class_id
      AND class_students.student_id = get_current_profile_id()
    )
  );

CREATE POLICY "class_books_manage_teacher"
  ON class_books FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_books.class_id
      AND (
        classes.teacher_id = get_current_profile_id()
        OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN')
      )
    )
  );

-- ============================================================================
-- BOOK RENDER JOBS POLICIES
-- ============================================================================

CREATE POLICY "book_render_jobs_select_librarian_admin"
  ON book_render_jobs FOR SELECT
  USING (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'));

CREATE POLICY "book_render_jobs_manage_librarian_admin"
  ON book_render_jobs FOR ALL
  USING (get_current_user_role() IN ('LIBRARIAN', 'ADMIN'));

-- ============================================================================
-- STUDENT BOOKS POLICIES
-- ============================================================================

CREATE POLICY "student_books_select_own"
  ON student_books FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "student_books_select_teacher_admin"
  ON student_books FOR SELECT
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

CREATE POLICY "student_books_insert_own"
  ON student_books FOR INSERT
  WITH CHECK (student_id = get_current_profile_id());

CREATE POLICY "student_books_update_own"
  ON student_books FOR UPDATE
  USING (student_id = get_current_profile_id());

CREATE POLICY "student_books_delete_own"
  ON student_books FOR DELETE
  USING (
    student_id = get_current_profile_id()
    OR get_current_user_role() = 'ADMIN'
  );

-- ============================================================================
-- QUIZZES POLICIES
-- ============================================================================

CREATE POLICY "quizzes_select_teacher_admin"
  ON quizzes FOR SELECT
  USING (
    created_by_id = get_current_profile_id()
    OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN')
  );

CREATE POLICY "quizzes_select_student_assigned"
  ON quizzes FOR SELECT
  USING (
    -- Student can see quizzes for books in their assigned classes
    EXISTS (
      SELECT 1 FROM class_books cb
      JOIN class_students cs ON cb.class_id = cs.class_id
      WHERE cb.book_id = quizzes.book_id
      AND cs.student_id = get_current_profile_id()
    )
    OR
    -- Student can see quizzes for books they're reading
    EXISTS (
      SELECT 1 FROM student_books sb
      WHERE sb.book_id = quizzes.book_id
      AND sb.student_id = get_current_profile_id()
    )
  );

CREATE POLICY "quizzes_insert_teacher_admin"
  ON quizzes FOR INSERT
  WITH CHECK (
    created_by_id = get_current_profile_id()
    AND get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN')
  );

CREATE POLICY "quizzes_update_own"
  ON quizzes FOR UPDATE
  USING (
    created_by_id = get_current_profile_id()
    OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN')
  );

CREATE POLICY "quizzes_delete_own"
  ON quizzes FOR DELETE
  USING (
    created_by_id = get_current_profile_id()
    OR get_current_user_role() = 'ADMIN'
  );

-- ============================================================================
-- QUIZ ATTEMPTS POLICIES
-- ============================================================================

CREATE POLICY "quiz_attempts_select_own"
  ON quiz_attempts FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "quiz_attempts_select_teacher_admin"
  ON quiz_attempts FOR SELECT
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

CREATE POLICY "quiz_attempts_insert_own"
  ON quiz_attempts FOR INSERT
  WITH CHECK (student_id = get_current_profile_id());

-- No update/delete - quiz attempts are immutable

-- ============================================================================
-- ACHIEVEMENTS POLICIES (Legacy)
-- ============================================================================

CREATE POLICY "achievements_select_all"
  ON achievements FOR SELECT
  USING (true);

CREATE POLICY "achievements_manage_admin"
  ON achievements FOR ALL
  USING (get_current_user_role() = 'ADMIN');

CREATE POLICY "student_achievements_select_own"
  ON student_achievements FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "student_achievements_select_teacher_admin"
  ON student_achievements FOR SELECT
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

CREATE POLICY "student_achievements_insert_system"
  ON student_achievements FOR INSERT
  WITH CHECK (true); -- System can award achievements

-- ============================================================================
-- QUIZ CHECKPOINTS POLICIES
-- ============================================================================

CREATE POLICY "quiz_checkpoints_select_all"
  ON quiz_checkpoints FOR SELECT
  USING (true);

CREATE POLICY "quiz_checkpoints_manage_teacher_admin"
  ON quiz_checkpoints FOR ALL
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

-- ============================================================================
-- STUDENT CHECKPOINT PROGRESS POLICIES
-- ============================================================================

CREATE POLICY "student_checkpoint_progress_select_own"
  ON student_checkpoint_progress FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "student_checkpoint_progress_select_teacher_admin"
  ON student_checkpoint_progress FOR SELECT
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

CREATE POLICY "student_checkpoint_progress_insert_own"
  ON student_checkpoint_progress FOR INSERT
  WITH CHECK (student_id = get_current_profile_id());

CREATE POLICY "student_checkpoint_progress_update_own"
  ON student_checkpoint_progress FOR UPDATE
  USING (student_id = get_current_profile_id());

-- ============================================================================
-- BADGES POLICIES
-- ============================================================================

CREATE POLICY "badges_select_active"
  ON badges FOR SELECT
  USING (is_active = true OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN'));

CREATE POLICY "badges_manage_admin"
  ON badges FOR ALL
  USING (get_current_user_role() = 'ADMIN');

CREATE POLICY "student_badges_select_own"
  ON student_badges FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "student_badges_select_all_admin"
  ON student_badges FOR SELECT
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

CREATE POLICY "student_badges_insert_system"
  ON student_badges FOR INSERT
  WITH CHECK (true); -- System can award badges

-- ============================================================================
-- XP TRANSACTIONS POLICIES
-- ============================================================================

CREATE POLICY "xp_transactions_select_own"
  ON xp_transactions FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "xp_transactions_select_admin"
  ON xp_transactions FOR SELECT
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

CREATE POLICY "xp_transactions_insert_system"
  ON xp_transactions FOR INSERT
  WITH CHECK (true); -- System can create XP transactions

-- ============================================================================
-- READING CHALLENGES POLICIES
-- ============================================================================

CREATE POLICY "reading_challenges_select_active"
  ON reading_challenges FOR SELECT
  USING (is_active = true OR get_current_user_role() IN ('ADMIN', 'LIBRARIAN'));

CREATE POLICY "reading_challenges_manage_admin"
  ON reading_challenges FOR ALL
  USING (get_current_user_role() IN ('ADMIN', 'LIBRARIAN'));

CREATE POLICY "student_challenge_progress_select_own"
  ON student_challenge_progress FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "student_challenge_progress_select_admin"
  ON student_challenge_progress FOR SELECT
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

CREATE POLICY "student_challenge_progress_insert_own"
  ON student_challenge_progress FOR INSERT
  WITH CHECK (student_id = get_current_profile_id());

CREATE POLICY "student_challenge_progress_update_own"
  ON student_challenge_progress FOR UPDATE
  USING (student_id = get_current_profile_id());

-- ============================================================================
-- LOGIN BROADCASTS POLICIES
-- ============================================================================

CREATE POLICY "login_broadcasts_select_active"
  ON login_broadcasts FOR SELECT
  USING (is_active = true);

CREATE POLICY "login_broadcasts_manage_admin"
  ON login_broadcasts FOR ALL
  USING (get_current_user_role() = 'ADMIN');

-- ============================================================================
-- WEEKLY CHALLENGE COMPLETIONS POLICIES
-- ============================================================================

CREATE POLICY "weekly_challenge_completions_select_own"
  ON weekly_challenge_completions FOR SELECT
  USING (student_id = get_current_profile_id());

CREATE POLICY "weekly_challenge_completions_select_admin"
  ON weekly_challenge_completions FOR SELECT
  USING (get_current_user_role() IN ('TEACHER', 'LIBRARIAN', 'ADMIN'));

CREATE POLICY "weekly_challenge_completions_insert_own"
  ON weekly_challenge_completions FOR INSERT
  WITH CHECK (student_id = get_current_profile_id());

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_current_profile_id IS 'Get current users profile ID from session context';
COMMENT ON FUNCTION get_current_user_role IS 'Get current users role from session context';
