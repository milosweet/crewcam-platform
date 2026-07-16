// server/db/seed.js — Seed demo data for development
// Creates a demo org, admin user, event with branding and themes.

import "dotenv/config";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { pool, query } from "../config/database.js";

async function seed() {
  console.log("Seeding database...");

  // Demo organization
  const orgResult = await query(
    `INSERT INTO organizations (name, slug) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ["CrewCam Demo", "crewcam-demo"]
  );
  const orgId = orgResult.rows[0].id;
  console.log(`  ✓ Organization: CrewCam Demo (${orgId})`);

  // Admin user (password: "admin123")
  const passwordHash = await bcrypt.hash("admin123", 10);
  await query(
    `INSERT INTO users (org_id, email, name, password_hash, role) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [orgId, "admin@crewcam.demo", "Demo Admin", passwordHash, "admin"]
  );
  console.log("  ✓ Admin user: admin@crewcam.demo / admin123");

  // Demo event
  const boothKey = crypto.randomBytes(16).toString("hex");
  const eventResult = await query(
    `INSERT INTO events (org_id, name, slug, status, booth_key, starts_at, ends_at, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (slug) DO UPDATE SET booth_key = EXCLUDED.booth_key
     RETURNING id`,
    [
      orgId,
      "Pharma Sailing Conference",
      "pharma-sailing-2026",
      "draft",
      boothKey,
      "2026-08-15T09:00:00Z",
      "2026-08-17T18:00:00Z",
      JSON.stringify({ watermark: false }),
    ]
  );
  const eventId = eventResult.rows[0].id;
  console.log(`  ✓ Event: Pharma Sailing Conference (booth_key: ${boothKey})`);

  // Event branding
  await query(
    `INSERT INTO event_branding (event_id, primary_color, secondary_color, attractor_heading, attractor_subheading)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id) DO UPDATE SET primary_color = EXCLUDED.primary_color`,
    [eventId, "#0c4a6e", "#38bdf8", "Welcome Aboard!", "Step up for your crew photo"]
  );
  console.log("  ✓ Event branding");

  // Themes
  const themes = [
    {
      name: "Sailing Adventure",
      mode: "fun",
      prompt: "The person is standing at the helm of a luxury sailing yacht, ocean spray in the background, golden hour sunlight, wind in their hair.",
      sort_order: 0,
      is_default: true,
    },
    {
      name: "Tropical Port",
      mode: "fun",
      prompt: "The person is standing on a tropical dock with colorful boats, palm trees, and turquoise water behind them. Bright sunny day.",
      sort_order: 1,
      is_default: false,
    },
    {
      name: "Corporate Headshot",
      mode: "corporate",
      prompt: "Professional corporate headshot with a clean navy blue gradient background, studio lighting, shoulders up.",
      sort_order: 2,
      is_default: false,
    },
  ];

  for (const theme of themes) {
    await query(
      `INSERT INTO themes (event_id, name, mode, gemini_prompt, sort_order, is_default)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [eventId, theme.name, theme.mode, theme.prompt, theme.sort_order, theme.is_default]
    );
    console.log(`  ✓ Theme: ${theme.name} (${theme.mode})`);
  }

  // Second demo event (live)
  const boothKey2 = crypto.randomBytes(16).toString("hex");
  const event2Result = await query(
    `INSERT INTO events (org_id, name, slug, status, booth_key, starts_at, ends_at, settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (slug) DO UPDATE SET booth_key = EXCLUDED.booth_key
     RETURNING id`,
    [
      orgId,
      "Summer Gala 2026",
      "summer-gala-2026",
      "live",
      boothKey2,
      "2026-07-20T18:00:00Z",
      "2026-07-20T23:00:00Z",
      JSON.stringify({ watermark: false }),
    ]
  );
  const event2Id = event2Result.rows[0].id;

  await query(
    `INSERT INTO event_branding (event_id, primary_color, secondary_color, attractor_heading, attractor_subheading)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id) DO UPDATE SET primary_color = EXCLUDED.primary_color`,
    [event2Id, "#7c3aed", "#a78bfa", "Strike a Pose!", "Your AI-powered photo moment"]
  );

  await query(
    `INSERT INTO themes (event_id, name, mode, gemini_prompt, sort_order, is_default)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [event2Id, "Red Carpet", "fun", "The person is on a red carpet at a glamorous awards ceremony, paparazzi flashes behind them, evening gown/tuxedo energy.", 0, true]
  );
  console.log(`  ✓ Event: Summer Gala 2026 (live, booth_key: ${boothKey2})`);

  const baseUrl = process.env.PUBLIC_URL || "http://localhost:8787";

  console.log("\n════════════════════════════════════════════");
  console.log("  Seed complete!");
  console.log("════════════════════════════════════════════");
  console.log("\n  Admin login:");
  console.log("    Email:    admin@crewcam.demo");
  console.log("    Password: admin123");
  console.log(`\n  Pharma Sailing (draft) — booth_key: ${boothKey}`);
  console.log(`    Kiosk:    ${baseUrl}/booth/pharma-sailing-2026/kiosk?key=${boothKey}`);
  console.log(`    Gallery:  ${baseUrl}/gallery/pharma-sailing-2026`);
  console.log(`\n  Summer Gala (live) — booth_key: ${boothKey2}`);
  console.log(`    Kiosk:    ${baseUrl}/booth/summer-gala-2026/kiosk?key=${boothKey2}`);
  console.log(`    Gallery:  ${baseUrl}/gallery/summer-gala-2026`);
  console.log(`\n  Admin:      ${baseUrl}/admin`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
