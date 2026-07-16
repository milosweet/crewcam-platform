// server/config/database.js — PostgreSQL connection pool

import pg from "pg";

const dbUrl = process.env.DATABASE_URL || "";

// Determine SSL: if the URL explicitly says sslmode=disable or uses
// Railway's internal network (.railway.internal), skip SSL.
// Otherwise enable SSL in production with rejectUnauthorized: false.
const isInternal = dbUrl.includes(".railway.internal");
const sslDisabled = dbUrl.includes("sslmode=disable");
const isProduction = process.env.NODE_ENV === "production";

let sslConfig = false;
if (isProduction && !isInternal && !sslDisabled) {
  sslConfig = { rejectUnauthorized: false };
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: sslConfig,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err);
});

/**
 * Run a query against the pool.
 * @param {string} text - SQL query
 * @param {any[]} [params] - query parameters
 */
export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== "production") {
    console.log(`  SQL (${duration}ms): ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`);
  }
  return result;
}

export { pool };
export default { query, pool };
