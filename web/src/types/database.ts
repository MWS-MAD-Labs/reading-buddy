/**
 * Database Types
 *
 * Type definitions for database tables and their relationships.
 * These types match the Supabase schema.
 */

// ============================================================================
// Books
// ============================================================================

export interface Book {
  id: number;
  title: string;
  author: string;
  format: "pdf" | "epub" | "mobi" | "azw" | "azw3";
  page_count: number | null;
  cover_url: string | null;
  file_url: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Quizzes
// ============================================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

export interface QuizQuestionsData {
  title: string;
  description?: string;
  questions: QuizQuestion[];
}

export interface Quiz {
  id: number;
  book_id: number;
  title: string;
  description: string | null;
  questions: QuizQuestionsData;
  status: "draft" | "published";
  is_published: boolean;
  tags: string[] | null;
  start_page: number | null;
  end_page: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuizWithBook extends Quiz {
  book: Pick<Book, "id" | "title" | "author">;
}

export interface QuizStatistics extends Quiz {
  attempt_count: number;
  avg_score: number | null;
  pass_rate: number | null;
}

export interface QuizStatisticsWithBook extends QuizStatistics {
  book: Pick<Book, "id" | "title" | "author">;
}

// ============================================================================
// Quiz Assignments
// ============================================================================

export interface QuizAssignment {
  id: number;
  quiz_id: number;
  class_id: number;
  assigned_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizAssignmentWithDetails extends QuizAssignment {
  quiz: Quiz;
  class: {
    id: number;
    name: string;
    code: string;
  };
}

// ============================================================================
// Quiz Attempts
// ============================================================================

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  student_id: string;
  answers: number[];
  score: number;
  total_questions: number;
  passed: boolean;
  completed_at: string;
  created_at: string;
}

export interface QuizAttemptWithDetails extends QuizAttempt {
  quiz: Quiz;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// Classes
// ============================================================================

export interface Class {
  id: number;
  name: string;
  code: string;
  description: string | null;
  teacher_id: string;
  created_at: string;
  updated_at: string;
}

export interface ClassWithTeacher extends Class {
  teacher: {
    id: string;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// Student Books (Reading Progress)
// ============================================================================

export interface StudentBook {
  id: number;
  student_id: string;
  book_id: number;
  class_id: number | null;
  current_page: number;
  total_pages: number | null;
  status: "not_started" | "in_progress" | "completed";
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface StudentBookWithDetails extends StudentBook {
  book: Book;
  class: Pick<Class, "id" | "name" | "code"> | null;
}

// ============================================================================
// Reading Entries
// ============================================================================

export interface ReadingEntry {
  id: number;
  student_id: string;
  book_id: number;
  class_id: number | null;
  pages_read: number;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface ReadingEntryWithDetails extends ReadingEntry {
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  book: Pick<Book, "id" | "title" | "author">;
}

// ============================================================================
// Users / Profiles
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "teacher" | "librarian" | "admin";
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  role: "STUDENT" | "TEACHER" | "LIBRARIAN" | "ADMIN";
  full_name: string | null;
  grade: number | null;
  access_level:
    | "KINDERGARTEN"
    | "LOWER_ELEMENTARY"
    | "UPPER_ELEMENTARY"
    | "JUNIOR_HIGH"
    | "TEACHERS_STAFF"
    | null;
  points: number;
  xp: number;
  level: number;
  reading_streak: number;
  longest_streak: number;
  last_read_date: string | null;
  total_books_completed: number;
  total_pages_read: number;
  total_quizzes_completed: number;
  total_perfect_quizzes: number;
  updated_at: string;
}

export interface ProfileGamificationStats {
  xp: number;
  level: number;
  reading_streak: number;
  longest_streak: number;
  total_books_completed: number;
  total_pages_read: number;
  total_quizzes_completed: number;
  total_perfect_quizzes: number;
  xp_to_next_level: number;
  xp_progress_percent: number;
}

// ============================================================================
// Badges & Achievements
// ============================================================================

export type BadgeType =
  | "checkpoint"
  | "quiz_mastery"
  | "book_completion"
  | "streak"
  | "custom";
export type BadgeTier = "bronze" | "silver" | "gold" | "platinum" | "special";
export type BadgeCategory =
  | "reading"
  | "quiz"
  | "streak"
  | "milestone"
  | "special"
  | "general";

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  badge_type: BadgeType;
  criteria: BadgeCriteria;
  tier: BadgeTier;
  xp_reward: number;
  category: BadgeCategory;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BadgeCriteria {
  type: string;
  count?: number;
  minScore?: number;
  days?: number;
  quizCount?: number;
  before?: string;
  after?: string;
}

export interface StudentBadge {
  id: string;
  student_id: string;
  badge_id: string;
  earned_at: string;
  book_id: number | null;
  quiz_id: number | null;
  metadata: Record<string, unknown> | null;
}

export interface StudentBadgeWithDetails extends StudentBadge {
  badge: Badge;
}

export interface BadgeProgress {
  badge: Badge;
  earned: boolean;
  earned_at: string | null;
  progress: number; // 0-100 percentage
  current_value: number;
  target_value: number;
}

// ============================================================================
// XP Transactions
// ============================================================================

export type XPSource =
  | "page_read"
  | "book_completed"
  | "quiz_completed"
  | "quiz_perfect"
  | "streak_bonus"
  | "badge_earned"
  | "challenge_completed"
  | "daily_bonus";

export interface XPTransaction {
  id: string;
  student_id: string;
  amount: number;
  source: XPSource;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

// ============================================================================
// Reading Challenges
// ============================================================================

export type ChallengeType = "daily" | "weekly" | "monthly" | "event" | "custom";

export interface ReadingChallenge {
  id: string;
  name: string;
  description: string | null;
  challenge_type: ChallengeType;
  start_date: string | null;
  end_date: string | null;
  goal_criteria: ChallengeCriteria;
  reward_xp: number;
  reward_badge_id: string | null;
  created_by_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ChallengeCriteria {
  type:
    | "pages_read"
    | "books_completed"
    | "quizzes_completed"
    | "streak_days"
    | "custom";
  target: number;
  description?: string;
}

export interface StudentChallengeProgress {
  id: string;
  student_id: string;
  challenge_id: string;
  progress: {
    current: number;
    target: number;
  };
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface StudentChallengeWithDetails extends StudentChallengeProgress {
  challenge: ReadingChallenge;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  full_name: string;
  grade: number | null;
  value: number;
  level?: number;
}

export type LeaderboardType = "xp" | "streak" | "books" | "pages" | "quizzes";

// ============================================================================
// Utility Types
// ============================================================================

export type DatabaseError = {
  message: string;
  code?: string;
  details?: string;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type SortParams = {
  field: string;
  ascending?: boolean;
};
