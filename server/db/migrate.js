// server/db/migrate.js — Simple migration runner
// Reads numbered .sql files from migrations/ and executes them in order,
// tracking which have already run in a _migrations table.

import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool, query } from "../config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id serial PRIMARY KEY,
      filename varchar(255) NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await query("SELECT filename FROM _migrations ORDER BY id");
  return new Set(result.rows.map((r) => r.filename));
}

async function run() {
  console.log("Running migrations...");
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = (await fs.readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  ✓ ${file} (already applied)`);
      continue;
    }
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    console.log(`  → applying ${file}...`);
    await query(sql);
    await query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
    count++;
    console.log(`  ✓ ${file} applied`);
  }

  console.log(count > 0 ? `Done. Applied ${count} migration(s).` : "No new migrations to apply.");
  await pool.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
