// server/routes/branding.js — Event branding GET/PUT + logo upload

import { Router } from "express";
import { query } from "../config/database.js";
import { authGuard, adminOnly } from "../middleware/authGuard.js";
import { eventContext } from "../middleware/eventContext.js";

const router = Router({ mergeParams: true });

// All routes require auth + event context
router.use(authGuard);
router.use(eventContext({ includeBranding: true }));

// Verify event belongs to user's org
function verifyOrg(req, res, next) {
  if (req.event.org_id !== req.user.orgId) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
}

router.use(verifyOrg);

// GET /api/events/:slug/branding — get branding config
router.get("/", (req, res) => {
  res.json({ branding: req.event.branding || null });
});

// PUT /api/events/:slug/branding — update branding
router.put("/", adminOnly, async (req, res) => {
  try {
    const {
      primary_color,
      secondary_color,
      logo_url,
      attractor_heading,
      attractor_subheading,
      gallery_footer_text,
    } = req.body || {};

    // Upsert — if branding row doesn't exist yet, create it
    const existing = await query(
      "SELECT id FROM event_branding WHERE event_id = $1",
      [req.event.id]
    );

    let result;

    if (existing.rows.length > 0) {
      result = await query(
        `UPDATE event_branding SET
          primary_color = COALESCE($1, primary_color),
          secondary_color = COALESCE($2, secondary_color),
          logo_url = COALESCE($3, logo_url),
          attractor_heading = COALESCE($4, attractor_heading),
          attractor_subheading = COALESCE($5, attractor_subheading),
          gallery_footer_text = COALESCE($6, gallery_footer_text)
         WHERE event_id = $7
         RETURNING *`,
        [
          primary_color || null,
          secondary_color || null,
          logo_url || null,
          attractor_heading || null,
          attractor_subheading || null,
          gallery_footer_text || null,
          req.event.id,
        ]
      );
    } else {
      result = await query(
        `INSERT INTO event_branding (event_id, primary_color, secondary_color, logo_url, attractor_heading, attractor_subheading, gallery_footer_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          req.event.id,
          primary_color || null,
          secondary_color || null,
          logo_url || null,
          attractor_heading || null,
          attractor_subheading || null,
          gallery_footer_text || null,
        ]
      );
    }

    res.json({ branding: result.rows[0] });
  } catch (err) {
    console.error("Update branding error:", err);
    res.status(500).json({ error: "Failed to update branding" });
  }
});

// POST /api/events/:slug/branding/logo — upload logo (base64 body for now)
// In Phase 3 this will upload to R2; for now, accept a URL or base64.
router.post("/logo", adminOnly, async (req, res) => {
  try {
    const { logo_url } = req.body || {};

    if (!logo_url) {
      return res.status(400).json({ error: "logo_url required" });
    }

    // TODO Phase 3: accept multipart upload, store in R2, return URL
    // For now, just save the provided URL directly
    const result = await query(
      "UPDATE event_branding SET logo_url = $1 WHERE event_id = $2 RETURNING *",
      [logo_url, req.event.id]
    );

    if (result.rows.length === 0) {
      // Branding row doesn't exist yet — create it
      const insert = await query(
        "INSERT INTO event_branding (event_id, logo_url) VALUES ($1, $2) RETURNING *",
        [req.event.id, logo_url]
      );
      return res.json({ branding: insert.rows[0] });
    }

    res.json({ branding: result.rows[0] });
  } catch (err) {
    console.error("Upload logo error:", err);
    res.status(500).json({ error: "Failed to upload logo" });
  }
});

export default router;
