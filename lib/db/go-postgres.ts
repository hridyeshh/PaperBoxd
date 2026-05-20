// Direct connection to the Go backend's PostgreSQL database.
// Used as a transitional helper to auto-heal password drift between
// MongoDB and Go backend during the MongoDB → PostgreSQL migration.
//
// Once all active users have logged in at least once post-migration,
// this file and its usages can be removed.

import { Pool } from "pg";

const connectionString = process.env.GO_DATABASE_URL;

let pool: Pool | null = null;

function getPool(): Pool {
  if (!connectionString) {
    throw new Error("GO_DATABASE_URL is not set");
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

/**
 * Updates the bcrypt password hash for a user identified by email.
 * Returns true if a row was updated, false otherwise.
 */
export async function updateGoUserPasswordHash(
  email: string,
  bcryptHash: string
): Promise<boolean> {
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`,
      [bcryptHash, email.toLowerCase()]
    );
    return (res.rowCount ?? 0) > 0;
  } finally {
    client.release();
  }
}
