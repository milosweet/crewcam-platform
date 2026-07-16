// server/routes/photos.js — Photo capture, status polling, and booth photo list
// These routes are booth-key authenticated and scoped to an event via :slug.

import { Router } from "express";
import { query } from "../config/database.js";
import { eventContext } from "../middleware/eventContext.js";
import { boothKeyAuth } from "../middleware/boothKeyAuth.js";
import { processPhoto } from "../services/renderPipeline.js";
import { rateLimit } from "../middleware/rateLimiter.js";

const router = Router({ mergeParams: true });

// All routes need event context + booth key
router.use(eventContext({ includeThemes: true, requireLive: true }));
router.use(boothKeyAuth);

// Rate limit capture: 30 photos per minute per IP
const captureLimiter = rateLimit({ windowMs: 60_000, max: 30, message: "Photo capture rate limit exceeded. Please wait." });

// POST /api/booth/:slug/capture — upload photo, start render pipeline
router.post("/capture", captureLimiter, async (req, res) => {
  try {
    const { photo, theme_id, kiosk_number } = req.body || {};

    if (!photo) {
      return res.status(400).json({ error: "photo (base64 data URL) is required" });
    }

    // Resolve theme — use provided theme_id, or fall back to event's default theme
    let theme;
    if (theme_id) {
      const themeResult = await query(
        "SELECT * FROM themes WHERE id = $1 AND event_id = $2",
        [theme_id, req.event.id]
      );
      theme = themeResult.rows[0];
    }

    if (!theme) {
      // Use default theme for this event
      theme = (req.event.themes || []).find((t) => t.is_default) || req.event.themes?.[0];
    }

    if (!theme) {
      return res.status(400).json({ error: "No themes configured for this event" });
    }

    // Create photo row with status 'processing'
    const photoResult = await query(
      `INSERT INTO photos (event_id, theme_id, kiosk_number, status)
       VALUES ($1, $2, $3, 'processing')
       RETURNING *`,
      [req.event.id, theme.id, kiosk_number || 1]
    );

    const photoRow = photoResult.rows[0];

    // Track analytics
    await query(
      `INSERT INTO analytics_events (event_id, action, metadata)
       VALUES ($1, 'photo_taken', $2)`,
      [req.event.id, JSON.stringify({ theme_id: theme.id, kiosk_number: kiosk_number || 1 })]
    ).catch(() => {}); // don't fail capture on analytics error

    // Fire off the render pipeline asynchronously — don't await it
    processPhoto({
      photoId: photoRow.id,
      eventId: req.event.id,
      photoDataUrl: photo,
      prompt: theme.gemini_prompt,
    }).catch((err) => {
      console.error("Render pipeline error (async):", err);
    });

    // Return immediately with the photo ID for status polling
    res.status(202).json({
      photo: {
        id: photoRow.id,
        status: "processing",
        theme: theme.name,
      },
    });
  } catch (err) {
    console.error("Capture error:", err);
    res.status(500).json({ error: "Failed to start photo capture" });
  }
});

// GET /api/booth/:slug/photos/:id/status — poll render progress
router.get("/photos/:id/status", async (req, res) => {
  try {
    const result = await query(
      "SELECT id, status, rendered_url, thumbnail_url, share_code, error_message, created_at FROM photos WHERE id = $1 AND event_id = $2",
      [req.params.id, req.event.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const photo = result.rows[0];

    // Build QR URL if done
    let qrUrl = null;
    if (photo.share_code) {
      const publicUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
      qrUrl = `${publicUrl}/photo/${photo.share_code}`;
    }

    res.json({
      photo: {
        id: photo.id,
        status: photo.status,
        rendered_url: photo.rendered_url,
        thumbnail_url: photo.thumbnail_url,
        share_code: photo.share_code,
        qr_url: qrUrl,
        error: photo.error_message,
        created_at: photo.created_at,
      },
    });
  } catch (err) {
    console.error("Photo status error:", err);
    res.status(500).json({ error: "Failed to check photo status" });
  }
});

// GET /api/booth/:slug/photos — recent photos for operator view
router.get("/photos", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const result = await query(
      `SELECT p.id, p.status, p.rendered_url, p.thumbnail_url, p.share_code,
              p.kiosk_number, p.created_at, p.error_message,
              t.name AS theme_name
       FROM photos p
       LEFT JOIN themes t ON p.theme_id = t.id
       WHERE p.event_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.event.id, limit, offset]
    );

    // Get total count
    const countResult = await query(
      "SELECT COUNT(*) FROM photos WHERE event_id = $1",
      [req.event.id]
    );

    res.json({
      photos: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    });
  } catch (err) {
    console.error("List photos error:", err);
    res.status(500).json({ error: "Failed to list photos" });
  }
});

export default router;
