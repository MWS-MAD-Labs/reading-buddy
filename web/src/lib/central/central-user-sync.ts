import {
  centralApiToken,
  centralApplicationId,
  centralAuthHeaders,
  centralInternalBaseUrl,
} from "@/lib/central/central-config";
import {
  validateCentralEntitlement,
  clearCentralAccessCache,
  type CentralEntitlement,
} from "@/lib/central/central-access";
import { projectCentralUser } from "@/lib/central/central-user-projection";
import { pool, query } from "@/lib/db";

type CentralAccessRow = CentralEntitlement & {
  person: { full_name: string; email: string; unit: string | null };
};

export type CentralSyncSummary = {
  projected: number;
  revoked: number;
};

function connection() {
  const baseUrl = centralInternalBaseUrl();
  const token = centralApiToken();
  if (!baseUrl || !token) throw new Error("Central API is not configured");
  return { baseUrl, token };
}

async function centralGet<T>(path: string): Promise<T> {
  const { baseUrl, token } = connection();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { ...centralAuthHeaders(token), accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as
    | { data?: T; errors?: string }
    | null;
  if (!response.ok || body?.data === undefined) {
    throw new Error(
      body?.errors || `Central request failed with HTTP ${response.status}`,
    );
  }
  return body.data;
}

async function fetchCentralDirectory(): Promise<{
  rows: CentralAccessRow[];
  key: string;
}> {
  const applicationId = centralApplicationId();
  const rows: CentralAccessRow[] = [];
  let key = "";
  for (let page = 1; ; page += 1) {
    const { baseUrl, token } = connection();
    const url = new URL(`${baseUrl}/application-entitlements`);
    url.searchParams.set("application_id", applicationId);
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", "100");
    const response = await fetch(url, {
      headers: { ...centralAuthHeaders(token), accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as
      | {
          data?: CentralAccessRow[];
          paging?: { total_page: number };
          key?: string;
          errors?: string;
        }
      | null;
    if (!response.ok || !body?.data || !body.paging || !body.key) {
      throw new Error(
        body?.errors || "Central application directory response is invalid",
      );
    }
    rows.push(...body.data);
    key = body.key;
    if (page >= body.paging.total_page) break;
  }
  return { rows, key };
}

export async function fetchCentralDirectoryKey(): Promise<string> {
  const applicationId = encodeURIComponent(centralApplicationId());
  const result = await centralGet<{ key: string }>(
    `/application-entitlements/version?application_id=${applicationId}`,
  );
  if (!result.key) throw new Error("Central returned an empty directory key");
  return result.key;
}

async function inBatches<T>(
  values: readonly T[],
  size: number,
  run: (value: T) => Promise<void>,
) {
  for (let index = 0; index < values.length; index += size) {
    await Promise.all(values.slice(index, index + size).map(run));
  }
}

export async function syncUsersFromCentral(): Promise<CentralSyncSummary> {
  const { rows, key } = await fetchCentralDirectory();
  const seen = new Set<string>();

  await inBatches(rows, 8, async (row) => {
    const source = row.role === "STUDENT" ? "student" : "employee";
    const access = validateCentralEntitlement(row.person_id, source, row);
    await projectCentralUser(
      {
        sub: row.person_id,
        email: row.person.email,
        source,
      },
      row,
      access.role,
      access.permissions,
    );
    seen.add(row.person_id);
  });

  const personIds = [...seen];
  const revoked = await query(
    `UPDATE users
     SET central_status = 'no_access',
         central_permissions = ARRAY[]::TEXT[],
         central_synced_at = NOW(),
         updated_at = NOW()
     WHERE central_person_id IS NOT NULL
       AND NOT (central_person_id = ANY($1::TEXT[]))`,
    [personIds],
  );
  const summary = { projected: rows.length, revoked: revoked.rowCount ?? 0 };
  await query(
    `INSERT INTO central_sync_state (
       application, sync_key, synced_at, checked_at, last_error, last_summary
     )
     VALUES ($1, $2, NOW(), NOW(), NULL, $3::JSONB)
     ON CONFLICT (application) DO UPDATE
     SET sync_key = EXCLUDED.sync_key,
         synced_at = EXCLUDED.synced_at,
         checked_at = EXCLUDED.checked_at,
         last_error = NULL,
         last_summary = EXCLUDED.last_summary`,
    [centralApplicationId(), key, JSON.stringify(summary)],
  );
  clearCentralAccessCache();
  return summary;
}

const SYNC_LOCK_ID = 7_302_027;

export async function syncUsersIfChanged(): Promise<
  { status: "unchanged" | "locked" } | { status: "synced"; summary: CentralSyncSummary }
> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_xact_lock($1) AS locked",
      [SYNC_LOCK_ID],
    );
    if (!lock.rows[0]?.locked) {
      await client.query("ROLLBACK");
      return { status: "locked" };
    }

    const key = await fetchCentralDirectoryKey();
    const state = await client.query<{ sync_key: string }>(
      "SELECT sync_key FROM central_sync_state WHERE application = $1",
      [centralApplicationId()],
    );
    if (state.rows[0]?.sync_key === key) {
      await client.query(
        "UPDATE central_sync_state SET checked_at = NOW(), last_error = NULL WHERE application = $1",
        [centralApplicationId()],
      );
      await client.query("COMMIT");
      return { status: "unchanged" };
    }

    const summary = await syncUsersFromCentral();
    await client.query("COMMIT");
    return { status: "synced", summary };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    await query(
      `UPDATE central_sync_state
       SET checked_at = NOW(), last_error = $2
       WHERE application = $1`,
      [
        centralApplicationId(),
        error instanceof Error ? error.message : "Central sync failed",
      ],
    ).catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
