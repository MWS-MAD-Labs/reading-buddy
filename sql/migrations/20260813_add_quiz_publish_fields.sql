-- Add publishing state used by librarian quiz management.

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS status VARCHAR(50);

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN;

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS tags TEXT[];

UPDATE public.quizzes
SET status = 'draft'
WHERE status IS NULL;

UPDATE public.quizzes
SET is_published = FALSE
WHERE is_published IS NULL;

ALTER TABLE public.quizzes
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.quizzes
  ALTER COLUMN is_published SET DEFAULT FALSE;

-- The view is consumed by librarian quiz management and must expose the
-- publishing fields added above.
DROP VIEW IF EXISTS public.quiz_statistics;

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
  q.status,
  q.is_published,
  q.tags,
  COUNT(DISTINCT qa.id) AS total_attempts,
  COUNT(DISTINCT qa.student_id) AS unique_students,
  COUNT(DISTINCT qa.id) AS attempt_count,
  ROUND(AVG(qa.score), 2) AS average_score,
  ROUND(AVG(qa.score), 2) AS avg_score,
  MAX(qa.score) AS highest_score,
  MIN(qa.score) AS lowest_score,
  MAX(qa.submitted_at) AS last_attempted_at,
  CASE
    WHEN COUNT(qa.id) = 0 THEN 'no_attempts'
    WHEN AVG(qa.score) >= 80 THEN 'high_performance'
    WHEN AVG(qa.score) >= 60 THEN 'moderate_performance'
    ELSE 'needs_improvement'
  END AS performance_category,
  COUNT(DISTINCT CASE
    WHEN qa.submitted_at > NOW() - INTERVAL '7 days' THEN qa.id
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
  q.created_at,
  q.status,
  q.is_published,
  q.tags;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON public.quiz_statistics TO authenticated;
  END IF;
END
$$;
