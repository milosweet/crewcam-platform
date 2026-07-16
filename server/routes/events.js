// server/routes/events.js — Events CRUD

import { Router } from "express";
import crypto from "crypto";
import { query } from "../config/database.js";
import { authGuard, adminOnly } from "../middleware/authGuard.js";
import { slugify } from "../utils/slugify.js";

const router = Router();

// All routes require auth
router.use(authGuard);

// GET /api/events — list org's events (optional ?status=live filter)
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    let sql = "SELECT * FROM events WHERE org_id = $1";
    const params = [req.user.orgId];

    if (status) {
      sql += " AND status = $2";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";
    const result = await query(sql, params);
    res.json({ events: result.rows });
  } catch (err) {
    console.error("List events error:", err);
    res.status(500).json({ error: "Failed to list events" });
  }
});

// POST /api/events — create event
router.post("/", adminOnly, async (req, res) => {
  try {
    const { name, date, starts_at, ends_at, location, max_kiosks, gallery_public, settings } = req.body || {};
    if (!name) return res.status(400).json({ error: "Event name required" });

    // Admin form sends "date" (YYYY-MM-DD), map to starts_at
    const resolvedStartsAt = date || starts_at;

    // Generate unique slug
    let slug = slugify(name);
    const existing = await query("SELECT id FROM events WHERE slug = $1", [slug]);
    if (existing.rows.length > 0) {
      slug = `${slug}-${crypto.randomBytes(3).toString("hex")}`;
    }

    // Generate booth key
    const boothKey = crypto.randomBytes(16).toString("hex");

    const result = await query(
      `INSERT INTO events (org_id, name, slug, booth_key, starts_at, ends_at, max_kiosks, gallery_public, settings, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.orgId,
        name,
        slug,
        boothKey,
        resolvedStartsAt || null,
        ends_at || null,
        max_kiosks || 2,
        gallery_public !== false,
        JSON.stringify(settings || {}),
        location || null,
      ]
    );

    const event = result.rows[0];

    // Create default branding row
    await query(
      "INSERT INTO event_branding (event_id) VALUES ($1)",
      [event.id]
    );

    res.status(201).json({ event });
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// GET /api/events/:slug — event detail
router.get("/:slug", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM events WHERE slug = $1 AND org_id = $2",
      [req.params.slug, req.user.orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = result.rows[0];

    // Load branding
    const branding = await query(
      "SELECT * FROM event_branding WHERE event_id = $1",
      [event.id]
    );
    event.branding = branding.rows[0] || null;

    // Load themes
    const themes = await query(
      "SELECT * FROM themes WHERE event_id = $1 ORDER BY sort_order, created_at",
      [event.id]
    );
    event.themes = themes.rows;

    res.json({ event });
  } catch (err) {
    console.error("Get event error:", err);
    res.status(500).json({ error: "Failed to load event" });
  }
});

// PUT /api/events/:slug — update event
router.put("/:slug", adminOnly, async (req, res) => {
  try {
    const { name, date, starts_at, ends_at, location, max_kiosks, gallery_public, settings } = req.body || {};

    // Admin form sends "date" (YYYY-MM-DD), map it to starts_at
    const resolvedStartsAt = date || starts_at;

    const existing = await query(
      "SELECT * FROM events WHERE slug = $1 AND org_id = $2",
      [req.params.slug, req.user.orgId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = existing.rows[0];

    const result = await query(
      `UPDATE events SET
        name = COALESCE($1, name),
        starts_at = COALESCE($2, starts_at),
        ends_at = COALESCE($3, ends_at),
        max_kiosks = COALESCE($4, max_kiosks),
        gallery_public = COALESCE($5, gallery_public),
        settings = COALESCE($6, settings),
        location = COALESCE($7, location),
        updated_at = now()
       WHERE id = $8
       RETURNING *`,
      [
        name || null,
        resolvedStartsAt || null,
        ends_at !== undefined ? ends_at : null,
        max_kiosks || null,
        gallery_public !== undefined ? gallery_public : null,
        settings ? JSON.stringify(settings) : null,
        location !== undefined ? location : null,
        event.id,
      ]
    );

    res.json({ event: result.rows[0] });
  } catch (err) {
    console.error("Update event error:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// PUT /api/events/:slug/status — transition status
router.put("/:slug/status", adminOnly, async (req, res) => {
  try {
    const { status } = req.body || {};
    const validTransitions = {
      draft: ["live"],
      live: ["archived"],
      archived: ["draft"],
    };

    const existing = await query(
      "SELECT * FROM events WHERE slug = $1 AND org_id = $2",
      [req.params.slug, req.user.orgId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = existing.rows[0];
    const allowed = validTransitions[event.status] || [];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${event.status}' to '${status}'. Allowed: ${allowed.join(", ")}`,
      });
    }

    const result = await query(
      "UPDATE events SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
      [status, event.id]
    );

    res.json({ event: result.rows[0] });
  } catch (err) {
    console.error("Status transition error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// DELETE /api/events/:slug — delete (draft only)
router.delete("/:slug", adminOnly, async (req, res) => {
  try {
    const existing = await query(
      "SELECT * FROM events WHERE slug = $1 AND org_id = $2",
      [req.params.slug, req.user.orgId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (existing.rows[0].status !== "draft") {
      return res.status(400).json({ error: "Only draft events can be deleted" });
    }

    await query("DELETE FROM events WHERE id = $1", [existing.rows[0].id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
