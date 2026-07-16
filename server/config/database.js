// server/config/database.js — PostgreSQL connection pool

import pg from "pg";

const dbUrl = process.env.DATABASE_URL || "";
const isProduction = process.env.NODE_ENV === "production";
const sslDisabled = dbUrl.includes("sslmode=disable");

const pool = new pg.Pool({
  connectionString: dbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isProduction && !sslDisabled ? { rejectUnauthorized: false } : false,
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
