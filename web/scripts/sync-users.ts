import "dotenv/config";
import { syncUsersFromCentral } from "../src/lib/central/central-user-sync";
import { pool } from "../src/lib/db";

async function main() {
  try {
    const result = await syncUsersFromCentral();
    console.info(
      `Reading Buddy users synced: ${result.projected} projected, ${result.revoked} revoked`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
