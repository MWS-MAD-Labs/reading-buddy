-- ==========================================
-- Reading Buddy - PostgreSQL Extensions
-- Self-Hosted Version
-- ==========================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigram matching for text search (used for book search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Comments
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for password hashing and tokens';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram matching for fuzzy text search';
