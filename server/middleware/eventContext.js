// server/middleware/eventContext.js — Load event config from :slug param
// Attaches req.event with full event row, branding, and themes.

import { query } from "../config/database.js";

/**
 * Middleware factory. Loads the event matching :slug (or a custom param name).
 * Options:
 *   - paramName: route param to read slug from (default: "slug")
 *   - includeBranding: also load event_branding (default: true)
 *   - includeThemes: also load themes (default: false)
 *   - requireLive: reject if event status !== 'live' (default: false)
 */
export function eventContext(options = {}) {
  const {
    paramName = "slug",
    includeBranding = true,
    includeThemes = false,
    requireLive = false,
  } = options;

  return async (req, res, next) => {
    const slug = req.params[paramName];
    if (!slug) {
      return res.status(400).json({ error: "Missing event slug" });
    }

    try {
      // Load event
      const eventResult = await query(
        "SELECT * FROM events WHERE slug = $1",
        [slug]
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }

      const event = eventResult.rows[0];

      if (requireLive && event.status !== "live") {
        return res.status(403).json({ error: "Event is not currently live" });
      }

      // Optionally load branding
      if (includeBranding) {
        const brandingResult = await query(
          "SELECT * FROM event_branding WHERE event_id = $1",
          [event.id]
        );
        event.branding = brandingResult.rows[0] || null;
      }

      // Optionally load themes
      if (includeThemes) {
        const themesResult = await query(
          "SELECT * FROM themes WHERE event_id = $1 ORDER BY sort_order, created_at",
          [event.id]
        );
        event.themes = themesResult.rows;
      }

      req.event = event;
      next();
    } catch (err) {
      console.error("eventContext error:", err);
      return res.status(500).json({ error: "Failed to load event" });
    }
  };
}
