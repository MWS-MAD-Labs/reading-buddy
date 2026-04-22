#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Apply pending SQL migrations to a PostgreSQL container via docker exec.

Usage:
  ./scripts/apply_sql_migrations_via_docker.sh \
    --db-container reading-buddy-postgres-staging \
    --db-user reading_buddy \
    --db-name reading_buddy \
    --migrations-dir /path/to/sql/migrations

Notes:
  - Applies files listed in deploy-migrations.txt when present
  - Otherwise applies top-level, date-prefixed files matching sql/migrations/20*.sql
  - Tracks applied files in public.schema_migrations
  - Fails if an applied migration's checksum no longer matches the file on disk
EOF
}

DB_CONTAINER=""
DB_USER=""
DB_NAME=""
MIGRATIONS_DIR=""
MIGRATION_TABLE="public.schema_migrations"
MIGRATION_MANIFEST=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-container)
      DB_CONTAINER="$2"
      shift 2
      ;;
    --db-user)
      DB_USER="$2"
      shift 2
      ;;
    --db-name)
      DB_NAME="$2"
      shift 2
      ;;
    --migrations-dir)
      MIGRATIONS_DIR="$2"
      shift 2
      ;;
    --migration-table)
      MIGRATION_TABLE="$2"
      shift 2
      ;;
    --migration-manifest)
      MIGRATION_MANIFEST="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$DB_CONTAINER" || -z "$DB_USER" || -z "$DB_NAME" || -z "$MIGRATIONS_DIR" ]]; then
  echo "Missing required arguments." >&2
  usage >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not installed." >&2
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

if [[ -z "$MIGRATION_MANIFEST" ]]; then
  MIGRATION_MANIFEST="$MIGRATIONS_DIR/../deploy-migrations.txt"
fi

compute_sha256() {
  local file="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
    return
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
    return
  fi

  echo "Neither sha256sum nor shasum is available." >&2
  exit 1
}

escape_sql_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

run_psql() {
  local sql="$1"
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "$sql"
}

run_psql_quiet() {
  local sql="$1"
  docker exec "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -At -c "$sql"
}

echo "Ensuring migration tracking table exists in $MIGRATION_TABLE..."
run_psql "
CREATE TABLE IF NOT EXISTS $MIGRATION_TABLE (
  name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);"

declare -a migration_files=()

if [[ -f "$MIGRATION_MANIFEST" ]]; then
  echo "Using migration manifest: $MIGRATION_MANIFEST"
  while IFS= read -r line || [[ -n "$line" ]]; do
    trimmed="$(printf "%s" "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    if [[ -z "$trimmed" || "$trimmed" == \#* ]]; then
      continue
    fi

    file="$MIGRATIONS_DIR/$trimmed"
    if [[ ! -f "$file" ]]; then
      echo "Migration listed in manifest was not found: $trimmed" >&2
      exit 1
    fi

    migration_files+=("$file")
  done < "$MIGRATION_MANIFEST"
else
  mapfile -d '' migration_files < <(
    find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '20*.sql' -print0 | sort -z
  )
fi

if [[ ${#migration_files[@]} -eq 0 ]]; then
  echo "No deploy migrations found in $MIGRATIONS_DIR"
  exit 0
fi

echo "Found ${#migration_files[@]} deploy migration(s)."

for file in "${migration_files[@]}"; do
  name="$(basename "$file")"
  checksum="$(compute_sha256 "$file")"
  escaped_name="$(escape_sql_literal "$name")"
  escaped_checksum="$(escape_sql_literal "$checksum")"
  existing_checksum="$(
    run_psql_quiet "SELECT checksum FROM $MIGRATION_TABLE WHERE name = '$escaped_name';"
  )"

  if [[ -n "$existing_checksum" ]]; then
    if [[ "$existing_checksum" != "$checksum" ]]; then
      echo "Checksum mismatch for already-applied migration: $name" >&2
      echo "Stored:  $existing_checksum" >&2
      echo "Current: $checksum" >&2
      exit 1
    fi

    echo "Skipping already-applied migration: $name"
    continue
  fi

  echo "Applying migration: $name"
  docker exec -i "$DB_CONTAINER" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$file"

  run_psql "
    INSERT INTO $MIGRATION_TABLE (name, checksum)
    VALUES ('$escaped_name', '$escaped_checksum');
  "
done

echo "Migration run complete."
