-- =============================================
-- Fix: Update existing profiles with missing names from OAuth data
-- Purpose: Backfill full_name for users who signed up via Google OAuth
-- Date: 2025-11-19
-- =============================================

-- This script updates profiles that are missing full_name by extracting
-- the name from the auth.users metadata (populated by OAuth providers)

-- Update profiles with missing names
UPDATE profiles p
SET full_name = COALESCE(
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'name'
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR p.full_name = '')
  AND (
    u.raw_user_meta_data->>'full_name' IS NOT NULL
    OR u.raw_user_meta_data->>'name' IS NOT NULL
  );

-- Show results
SELECT
  COUNT(*) as updated_profiles,
  'Profiles updated with OAuth names' as description
FROM profiles
WHERE full_name IS NOT NULL
  AND full_name != ''
  AND updated_at >= NOW() - INTERVAL '1 minute';

-- Optional: Show remaining profiles without names
SELECT
  p.id,
  u.email,
  p.role,
  u.raw_user_meta_data
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.full_name IS NULL OR p.full_name = '';

-- Note: The handle_new_user() trigger function has been updated to
-- automatically capture names for future OAuth signups.
