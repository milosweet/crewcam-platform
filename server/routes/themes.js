// server/routes/themes.js — Themes CRUD for events

import { Router } from "express";
import { query } from "../config/database.js";
import { authGuard, adminOnly } from "../middleware/authGuard.js";
import { eventContext } from "../middleware/eventContext.js";

const router = Router({ mergeParams: true });

// All routes require auth + event context
router.use(authGuard);
router.use(eventContext({ includeThemes: false }));

// Verify event belongs to user's org
function verifyOrg(req, res, next) {
  if (req.event.org_id !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
}

router.use(verifyOrg);

// GET /api/events/:slug/themes — list themes for event
router.get("/", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM themes WHERE event_id = $1 ORDER BY sort_order, created_at",
      [req.event.id]
    );
    res.json({ themes: result.rows });
  } catch (err) {
    console.error("List themes error:", err);
    res.status(500).json({ error: "Failed to list themes" });
  }
});

// POST /api/events/:slug/themes — add theme
router.post("/", adminOnly, async (req, res) => {
  try {
    const { name, mode, gemini_prompt, background_url, overlay_url, sort_order, is_default } =
      req.body || {};

    if (!name) return res.status(400).json({ error: "Theme name required" });
    if (!gemini_prompt) return res.status(400).json({ error: "Gemini prompt required" });

    // If this theme is the default, unset any existing default
    if (is_default) {
      await query(
        "UPDATE themes SET is_default = false WHERE event_id = $1 AND is_default = true",
        [req.event.id]
      );
    }

    const result = await query(
      `INSERT INTO themes (event_id, name, mode, gemini_prompt, background_url, overlay_url, sort_order, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.event.id,
        name,
        mode || "fun",
        gemini_prompt,
        background_url || null,
        overlay_url || null,
        sort_order || 0,
        is_default || false,
      ]
    );

    res.status(201).json({ theme: result.rows[0] });
  } catch (err) {
    console.error("Create theme error:", err);
    res.status(500).json({ error: "Failed to create theme" });
  }
});

// PUT /api/events/:slug/themes/:id — update theme
router.put("/:id", adminOnly, async (req, res) => {
  try {
    const existing = await query(
      "SELECT * FROM themes WHERE id = $1 AND event_id = $2",
      [req.params.id, req.event.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Theme not found" });
    }

    const { name, mode, gemini_prompt, background_url, overlay_url, sort_order, is_default } =
      req.body || {};

    // If setting as default, unset others
    if (is_default) {
      await query(
        "UPDATE themes SET is_default = false WHERE event_id = $1 AND is_default = true AND id != $2",
        [req.event.id, req.params.id]
      );
    }

    const result = await query(
      `UPDATE themes SET
        name = COALESCE($1, name),
        mode = COALESCE($2, mode),
        gemini_prompt = COALESCE($3, gemini_prompt),
        background_url = COALESCE($4, background_url),
        overlay_url = COALESCE($5, overlay_url),
        sort_order = COALESCE($6, sort_order),
        is_default = COALESCE($7, is_default)
       WHERE id = $8
       RETURNING *`,
      [
        name || null,
        mode || null,
        gemini_prompt || null,
        background_url !== undefined ? background_url : null,
        overlay_url !== undefined ? overlay_url : null,
        sort_order !== undefined ? sort_order : null,
        is_default !== undefined ? is_default : null,
        req.params.id,
      ]
    );

    res.json({ theme: result.rows[0] });
  } catch (err) {
    console.error("Update theme error:", err);
    res.status(500).json({ error: "Failed to update theme" });
  }
});

// DELETE /api/events/:slug/themes/:id — remove theme
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    const existing = await query(
      "SELECT * FROM themes WHERE id = $1 AND event_id = $2",
      [req.params.id, req.event.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Theme not found" });
    }

    await query("DELETE FROM themes WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete theme error:", err);
    res.status(500).json({ error: "Failed to delete theme" });
  }
});

export default router;
