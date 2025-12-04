-- Check your user profile and role
SELECT id, role, full_name 
FROM profiles 
WHERE id = auth.uid();

-- Test if the RLS policy would allow you to see quiz 9
SELECT 
  q.id, 
  q.book_id,
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('LIBRARIAN', 'ADMIN')
  ) as should_see_quiz
FROM quizzes q
WHERE q.id = 9;
