import { Pool, PoolClient, QueryResult } from "pg";

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5434"),
  database: process.env.DB_NAME || "reading_buddy",
  user: process.env.DB_USER || "reading_buddy",
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

/**
 * Get a database client from the pool
 */
export async function getDbClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Execute a query directly (without RLS context)
 * Use this for admin operations or non-user-specific queries
 */
export async function query<T = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.log("Executed query", { text, duration, rows: res.rowCount });
  }

  return res;
}

/**
 * Execute a query with RLS context
 * This sets the app.user_id session variable before executing the query
 *
 * @param userId - The user ID to set in session context
 * @param text - SQL query
 * @param params - Query parameters
 */
export async function queryWithContext<T = any>(
  userId: string,
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const client = await pool.connect();

  try {
    // Validate userId
    if (!userId || typeof userId !== "string") {
      throw new Error(
        `Invalid userId for RLS context: ${JSON.stringify(userId)}`,
      );
    }

    // Set session variable for RLS (cannot use parameterized query for SET LOCAL)
    await client.query(`SET LOCAL app.user_id = '${userId}'`);

    const start = Date.now();
    const res = await client.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === "development") {
      console.log("Executed query with context", {
        userId,
        text,
        duration,
        rows: res.rowCount,
      });
    }

    return res;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a transaction with RLS context
 */
export async function transactionWithContext<T>(
  userId: string,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL app.user_id = $1", [userId]);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Export the pool for advanced use cases
export { pool };
