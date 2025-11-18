-- =============================================
-- Migration: Add function to get user emails
-- Purpose: Workaround for auth.admin.listUsers() failures
-- =============================================

-- Create a function to get user emails from auth.users
CREATE OR REPLACE FUNCTION get_all_user_emails()
RETURNS TABLE (
  user_id uuid,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.email::text as email
  FROM auth.users u;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_user_emails() TO authenticated;

COMMENT ON FUNCTION get_all_user_emails() IS 'Returns user IDs and emails from auth.users table for admin purposes';
