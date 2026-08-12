CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM profiles
  WHERE user_id = current_setting('app.user_id', TRUE)::UUID
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
AS $$
  SELECT role FROM profiles
  WHERE user_id = current_setting('app.user_id', TRUE)::UUID
  LIMIT 1;
$$;
