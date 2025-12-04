-- Check if quiz 9 exists
SELECT id, book_id, quiz_type, created_by_id, created_at 
FROM quizzes 
WHERE id = 9;

-- List all quizzes
SELECT id, book_id, quiz_type, created_at 
FROM quizzes 
ORDER BY id DESC 
LIMIT 10;
