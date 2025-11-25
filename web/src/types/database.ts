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
  format: 'pdf' | 'epub' | 'mobi' | 'azw' | 'azw3';
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
  status: 'draft' | 'published';
  is_published: boolean;
  tags: string[] | null;
  start_page: number | null;
  end_page: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuizWithBook extends Quiz {
  book: Pick<Book, 'id' | 'title' | 'author'>;
}

export interface QuizStatistics extends Quiz {
  attempt_count: number;
  avg_score: number | null;
  pass_rate: number | null;
}

export interface QuizStatisticsWithBook extends QuizStatistics {
  book: Pick<Book, 'id' | 'title' | 'author'>;
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
  status: 'not_started' | 'in_progress' | 'completed';
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface StudentBookWithDetails extends StudentBook {
  book: Book;
  class: Pick<Class, 'id' | 'name' | 'code'> | null;
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
  book: Pick<Book, 'id' | 'title' | 'author'>;
}

// ============================================================================
// Users / Profiles
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'teacher' | 'librarian' | 'admin';
  created_at: string;
  updated_at: string;
}

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
