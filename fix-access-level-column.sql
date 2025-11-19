-- =============================================
-- Fix: Add or modify access_level column in profiles table
-- Purpose: Fix "not-null constraint" error when updating staff roles
-- Date: 2025-11-19
-- =============================================

-- This script adds the access_level column if it doesn't exist,
-- or modifies it to be nullable if it exists with NOT NULL constraint

-- Step 1: Add column if it doesn't exist (for new installations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'access_level'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN access_level book_access_level;

    RAISE NOTICE 'Added access_level column to profiles table';
  ELSE
    RAISE NOTICE 'access_level column already exists';
  END IF;
END $$;

-- Step 2: Remove NOT NULL constraint if it exists (for existing installations)
DO $$
BEGIN
  -- Drop the NOT NULL constraint
  ALTER TABLE profiles
  ALTER COLUMN access_level DROP NOT NULL;

  RAISE NOTICE 'Removed NOT NULL constraint from access_level column';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'No NOT NULL constraint to remove (this is fine)';
END $$;

-- Step 3: Set NULL for all staff roles (TEACHER, LIBRARIAN, ADMIN)
UPDATE profiles
SET access_level = NULL
WHERE role IN ('TEACHER', 'LIBRARIAN', 'ADMIN')
  AND access_level IS NOT NULL;

-- Show results
SELECT
  role,
  COUNT(*) as user_count,
  COUNT(access_level) as with_access_level,
  COUNT(*) - COUNT(access_level) as without_access_level
FROM profiles
GROUP BY role
ORDER BY role;

-- Verification
DO $$
DECLARE
  col_nullable TEXT;
BEGIN
  SELECT is_nullable INTO col_nullable
  FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name = 'access_level';

  IF col_nullable = 'YES' THEN
    RAISE NOTICE '✅ SUCCESS: access_level column is now nullable';
  ELSE
    RAISE WARNING '⚠️  WARNING: access_level column is still NOT NULL';
  END IF;
END $$;

-- Expected behavior after this migration:
-- - STUDENT roles can have access_level set (KINDERGARTEN, LOWER_ELEMENTARY, etc.)
-- - TEACHER, LIBRARIAN, ADMIN roles will have access_level = NULL
-- - No more "not-null constraint" errors when updating to staff roles
