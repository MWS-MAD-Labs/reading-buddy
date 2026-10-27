import "dotenv/config";
import {
  CentralDataClient,
  comparePermissions,
  permissionCheckFailed,
} from "mws-central-auth/data-client";
import { PERMISSION_MANIFEST } from "../src/lib/central/access-control";

const APPLICATION_ID = process.env.HUB_SSO_APP_ID?.trim() || "reading-buddy";
const [mode, ...flags] = process.argv.slice(2);

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function centralClient() {
  const baseUrl = required("CENTRAL_API_BASE_URL")
    .replace(/\/+$/, "")
    .replace(/\/api\/internal$/, "");
  return new CentralDataClient({
    baseUrl,
    token: required("CENTRAL_API_TOKEN"),
  });
}

async function sync() {
  const result = await centralClient().publishPermissions(
    APPLICATION_ID,
    PERMISSION_MANIFEST,
    { confirmRemovals: flags.includes("--confirm-removals") },
  );
  console.info(
    `Reading Buddy permissions published: ${result.total} total, ${result.added} new`,
  );
  if (result.deprecated.length > 0) {
    console.warn(`Deprecated: ${result.deprecated.join(", ")}`);
  }
  for (const role of result.affected_roles) {
    console.warn(
      `${role.role} still carries deprecated permissions: ${role.permissions.join(", ")}`,
    );
  }
}

async function check() {
  const central = centralClient();
  const [registered, usage] = await Promise.all([
    central.listRegisteredPermissions(APPLICATION_ID),
    central.permissionUsage(APPLICATION_ID),
  ]);
  const result = comparePermissions(PERMISSION_MANIFEST, registered, usage);
  for (const [label, values] of Object.entries(result)) {
    if (values.length > 0) console.warn(`${label}: ${values.join(", ")}`);
  }
  if (
    permissionCheckFailed(result, {
      allowRemovals: flags.includes("--allow-removals"),
    })
  ) {
    throw new Error("Reading Buddy permissions do not match Central");
  }
  console.info("Reading Buddy permissions match Central");
}

async function main() {
  if (mode === "sync") await sync();
  else if (mode === "check") await check();
  else throw new Error("Use `sync` or `check`");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
