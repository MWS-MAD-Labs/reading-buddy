ALTER TABLE users
  ADD COLUMN IF NOT EXISTS central_unit_id TEXT,
  ADD COLUMN IF NOT EXISTS central_unit_name TEXT;
