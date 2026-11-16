#!/usr/bin/env node
// Applies deploy-safe SQL migrations on container start (like `prisma migrate
// deploy` in sibling apps), so a deploy can never ship code ahead of its schema.
//
// Compatible with scripts/apply_sql_migrations_via_docker.sh: same manifest,
// same public.schema_migrations table, same sha256 file checksums.
//
// Env: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL (same as app),
//      MIGRATIONS_DIR (default: <repo>/sql/migrations),
//      SKIP_DB_MIGRATIONS=true to bypass in an emergency.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATION_TABLE = "public.schema_migrations";
// Arbitrary constant so concurrent containers serialize migration runs.
const ADVISORY_LOCK_KEY = 815_204_771;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(
  process.env.MIGRATIONS_DIR || path.join(scriptDir, "../../sql/migrations"),
);
const manifestPath = path.join(migrationsDir, "../deploy-migrations.txt");

function log(message) {
  console.log(`[db-migrate] ${message}`);
}

function readMigrationNames() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Migration manifest not found: ${manifestPath}`);
  }
  return fs
    .readFileSync(manifestPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

async function main() {
  if (process.env.SKIP_DB_MIGRATIONS === "true") {
    log("SKIP_DB_MIGRATIONS=true, skipping.");
    return;
  }

  const migrations = readMigrationNames().map((name) => {
    const file = path.join(migrationsDir, name);
    if (!fs.existsSync(file)) {
      throw new Error(`Migration listed in manifest was not found: ${name}`);
    }
    const buffer = fs.readFileSync(file);
    return {
      name,
      sql: buffer.toString("utf8"),
      checksum: createHash("sha256").update(buffer).digest("hex"),
    };
  });

  const client = new pg.Client({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5434", 10),
    database: process.env.DB_NAME || "reading_buddy",
    user: process.env.DB_USER || "reading_buddy",
    password: process.env.DB_PASSWORD,
    ssl:
      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);

    const { rows } = await client.query(
      `SELECT name, checksum FROM ${MIGRATION_TABLE}`,
    );
    const applied = new Map(rows.map((row) => [row.name, row.checksum]));

    let appliedCount = 0;
    for (const migration of migrations) {
      const stored = applied.get(migration.name);
      if (stored) {
        if (stored !== migration.checksum) {
          throw new Error(
            `Checksum mismatch for already-applied migration ${migration.name} ` +
              `(stored ${stored}, current ${migration.checksum})`,
          );
        }
        continue;
      }

      log(`Applying ${migration.name}`);
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO ${MIGRATION_TABLE} (name, checksum) VALUES ($1, $2)`,
          [migration.name, migration.checksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`${migration.name}: ${error.message}`);
      }
      appliedCount += 1;
    }

    log(
      appliedCount > 0
        ? `Applied ${appliedCount} migration(s).`
        : "Schema is up to date.",
    );
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_KEY])
      .catch(() => {});
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[db-migrate] FAILED: ${error.message}`);
  process.exit(1);
});
