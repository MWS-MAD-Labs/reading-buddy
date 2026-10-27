ALTER TABLE users
  ADD COLUMN IF NOT EXISTS central_person_id TEXT,
  ADD COLUMN IF NOT EXISTS central_source TEXT,
  ADD COLUMN IF NOT EXISTS central_status TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS central_entitlement_id TEXT,
  ADD COLUMN IF NOT EXISTS central_entitlement_version BIGINT,
  ADD COLUMN IF NOT EXISTS central_permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS central_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_central_person_id_key
  ON users (central_person_id)
  WHERE central_person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_central_status_idx
  ON users (central_status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_central_source_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_central_source_check
      CHECK (central_source IS NULL OR central_source IN ('employee', 'student'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS central_sync_state (
  application TEXT PRIMARY KEY,
  sync_key TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL,
  checked_at TIMESTAMPTZ,
  last_error TEXT,
  last_summary JSONB
);
