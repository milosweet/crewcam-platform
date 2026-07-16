// server/routes/analytics.js — Per-event and org-wide analytics
// All routes require admin auth.

import { Router } from "express";
import { query } from "../config/database.js";
import { authGuard } from "../middleware/authGuard.js";
import { eventContext } from "../middleware/eventContext.js";

const router = Router({ mergeParams: true });

// All analytics routes require auth
router.use(authGuard);

// GET /api/events/:slug/analytics — per-event stats
router.get(
  "/events/:slug/analytics",
  eventContext({ includeBranding: false }),
  async (req, res) => {
    try {
      const eventId = req.event.id;

      // Photo counts by status
      const statusCounts = await query(
        `SELECT status, COUNT(*)::int AS count
         FROM photos WHERE event_id = $1
         GROUP BY status`,
        [eventId]
      );

      // Photos per hour (last 24h)
      const hourly = await query(
        `SELECT date_trunc('hour', created_at) AS hour, COUNT(*)::int AS count
         FROM photos WHERE event_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
         GROUP BY hour ORDER BY hour`,
        [eventId]
      );

      // Top themes
      const topThemes = await query(
        `SELECT t.name, COUNT(p.id)::int AS count
         FROM photos p JOIN themes t ON p.theme_id = t.id
         WHERE p.event_id = $1
         GROUP BY t.name ORDER BY count DESC LIMIT 10`,
        [eventId]
      );

      // Downloads
      const downloads = await query(
        `SELECT COALESCE(SUM(download_count), 0)::int AS total_downloads
         FROM photos WHERE event_id = $1`,
        [eventId]
      );

      // Gallery views
      const galleryViews = await query(
        `SELECT COUNT(*)::int AS count
         FROM analytics_events WHERE event_id = $1 AND action = 'gallery_viewed'`,
        [eventId]
      );

      // QR scans
      const qrScans = await query(
        `SELECT COUNT(*)::int AS count
         FROM analytics_events WHERE event_id = $1 AND action = 'qr_scanned'`,
        [eventId]
      );

      // Build status map
      const statuses = {};
      statusCounts.rows.forEach((r) => { statuses[r.status] = r.count; });

      res.json({
        event: { id: req.event.id, name: req.event.name, slug: req.event.slug },
        photos: {
          total: Object.values(statuses).reduce((a, b) => a + b, 0),
          done: statuses.done || 0,
          processing: statuses.processing || 0,
          failed: statuses.failed || 0,
        },
        hourly: hourly.rows,
        topThemes: topThemes.rows,
        downloads: downloads.rows[0]?.total_downloads || 0,
        galleryViews: galleryViews.rows[0]?.count || 0,
        qrScans: qrScans.rows[0]?.count || 0,
      });
    } catch (err) {
      console.error("Event analytics error:", err);
      res.status(500).json({ error: "Failed to load analytics" });
    }
  }
);

// GET /api/analytics/overview — org-wide dashboard stats
router.get("/analytics/overview", async (req, res) => {
  try {
    const orgId = req.user.orgId;

    // Total events by status
    const eventCounts = await query(
      `SELECT status, COUNT(*)::int AS count
       FROM events WHERE org_id = $1
       GROUP BY status`,
      [orgId]
    );

    // Total photos across all org events
    const photoCounts = await query(
      `SELECT p.status, COUNT(*)::int AS count
       FROM photos p JOIN events e ON p.event_id = e.id
       WHERE e.org_id = $1
       GROUP BY p.status`,
      [orgId]
    );

    // Total downloads
    const downloads = await query(
      `SELECT COALESCE(SUM(p.download_count), 0)::int AS total
       FROM photos p JOIN events e ON p.event_id = e.id
       WHERE e.org_id = $1`,
      [orgId]
    );

    // Recent activity (last 7 days)
    const recentActivity = await query(
      `SELECT ae.action, COUNT(*)::int AS count
       FROM analytics_events ae JOIN events e ON ae.event_id = e.id
       WHERE e.org_id = $1 AND ae.created_at > NOW() - INTERVAL '7 days'
       GROUP BY ae.action`,
      [orgId]
    );

    // Top events by photo count
    const topEvents = await query(
      `SELECT e.name, e.slug, e.status, COUNT(p.id)::int AS photo_count
       FROM events e LEFT JOIN photos p ON e.id = p.event_id
       WHERE e.org_id = $1
       GROUP BY e.id ORDER BY photo_count DESC LIMIT 10`,
      [orgId]
    );

    const events = {};
    eventCounts.rows.forEach((r) => { events[r.status] = r.count; });

    const photos = {};
    photoCounts.rows.forEach((r) => { photos[r.status] = r.count; });

    const activity = {};
    recentActivity.rows.forEach((r) => { activity[r.action] = r.count; });

    res.json({
      events: {
        total: Object.values(events).reduce((a, b) => a + b, 0),
        ...events,
      },
      photos: {
        total: Object.values(photos).reduce((a, b) => a + b, 0),
        ...photos,
      },
      downloads: downloads.rows[0]?.total || 0,
      recentActivity: activity,
      topEvents: topEvents.rows,
    });
  } catch (err) {
    console.error("Overview analytics error:", err);
    res.status(500).json({ error: "Failed to load overview" });
  }
});

export default router;
