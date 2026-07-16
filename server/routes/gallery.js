// server/routes/gallery.js — Public gallery and photo share pages
// No auth required — gallery is public by default (controlled by event.gallery_public flag).

import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "../config/database.js";
import { eventContext } from "../middleware/eventContext.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router({ mergeParams: true });

// ── API: Paginated gallery photos ────────────────────────
// GET /api/gallery/:slug/photos?limit=24&offset=0
router.get(
  "/api/gallery/:slug/photos",
  eventContext({ includeBranding: false, includeThemes: false }),
  async (req, res) => {
    try {
      const event = req.event;

      // Check gallery_public setting (defaults to true if column doesn't exist yet)
      if (event.gallery_public === false) {
        return res.status(403).json({ error: "Gallery is not public for this event" });
      }

      const limit = Math.min(parseInt(req.query.limit) || 24, 100);
      const offset = parseInt(req.query.offset) || 0;

      const result = await query(
        `SELECT p.id, p.rendered_url, p.thumbnail_url, p.share_code, p.created_at,
                t.name AS theme_name
         FROM photos p
         LEFT JOIN themes t ON p.theme_id = t.id
         WHERE p.event_id = $1 AND p.status = 'done'
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [event.id, limit, offset]
      );

      const countResult = await query(
        "SELECT COUNT(*) FROM photos WHERE event_id = $1 AND status = 'done'",
        [event.id]
      );

      const total = parseInt(countResult.rows[0].count);

      res.json({
        event: { name: event.name, slug: event.slug },
        photos: result.rows,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      });
    } catch (err) {
      console.error("Gallery photos error:", err);
      res.status(500).json({ error: "Failed to load gallery" });
    }
  }
);

// ── API: Single photo by share code ──────────────────────
// GET /api/photo/:shareCode
router.get("/api/photo/:shareCode", async (req, res) => {
  try {
    const result = await query(
      `SELECT p.id, p.rendered_url, p.thumbnail_url, p.original_url,
              p.share_code, p.created_at, p.download_count,
              t.name AS theme_name,
              e.name AS event_name, e.slug AS event_slug
       FROM photos p
       LEFT JOIN themes t ON p.theme_id = t.id
       JOIN events e ON p.event_id = e.id
       WHERE p.share_code = $1 AND p.status = 'done'`,
      [req.params.shareCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const photo = result.rows[0];

    // Load branding for the event
    const brandingResult = await query(
      "SELECT * FROM event_branding WHERE event_id = (SELECT event_id FROM photos WHERE share_code = $1)",
      [req.params.shareCode]
    );

    res.json({
      photo,
      branding: brandingResult.rows[0] || {},
    });
  } catch (err) {
    console.error("Photo lookup error:", err);
    res.status(500).json({ error: "Failed to load photo" });
  }
});

// ── API: Download endpoint (increments counter) ──────────
// GET /api/photo/:shareCode/download
router.get("/api/photo/:shareCode/download", async (req, res) => {
  try {
    const result = await query(
      `SELECT p.rendered_url, p.share_code, p.event_id
       FROM photos p
       WHERE p.share_code = $1 AND p.status = 'done'`,
      [req.params.shareCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const photo = result.rows[0];

    // Increment download counter
    await query(
      "UPDATE photos SET download_count = COALESCE(download_count, 0) + 1 WHERE share_code = $1",
      [req.params.shareCode]
    );

    // Track analytics
    await query(
      `INSERT INTO analytics_events (event_id, action, metadata)
       VALUES ($1, 'downloaded', $2)`,
      [photo.event_id, JSON.stringify({ share_code: photo.share_code })]
    ).catch(() => {});

    // Redirect to the rendered image URL for download
    res.redirect(photo.rendered_url);
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Failed to process download" });
  }
});

// ── HTML: Gallery page ───────────────────────────────────
// GET /gallery/:slug
router.get(
  "/gallery/:slug",
  eventContext({ includeBranding: true }),
  (req, res) => {
    const event = req.event;

    if (event.gallery_public === false) {
      return res.status(403).send("Gallery is not public for this event.");
    }

    // Track gallery view
    query(
      `INSERT INTO analytics_events (event_id, action) VALUES ($1, 'gallery_viewed')`,
      [event.id]
    ).catch(() => {});

    res.sendFile(
      path.resolve(__dirname, "..", "..", "gallery", "event.html")
    );
  }
);

// ── HTML: Photo share page ───────────────────────────────
// GET /photo/:shareCode
router.get("/photo/:shareCode", async (req, res) => {
  // Verify photo exists before serving
  const result = await query(
    "SELECT id FROM photos WHERE share_code = $1 AND status = 'done'",
    [req.params.shareCode]
  ).catch(() => ({ rows: [] }));

  if (result.rows.length === 0) {
    return res.status(404).send("Photo not found.");
  }

  // Track QR scan
  const photoRow = await query(
    "SELECT event_id FROM photos WHERE share_code = $1",
    [req.params.shareCode]
  ).catch(() => ({ rows: [] }));

  if (photoRow.rows.length) {
    query(
      `INSERT INTO analytics_events (event_id, action, metadata)
       VALUES ($1, 'qr_scanned', $2)`,
      [photoRow.rows[0].event_id, JSON.stringify({ share_code: req.params.shareCode })]
    ).catch(() => {});
  }

  res.sendFile(
    path.resolve(__dirname, "..", "..", "gallery", "photo.html")
  );
});

export default router;
