// server/routes/booth.js — Booth config endpoint and frontend serving
// Serves the booth configuration (themes, branding, settings) and the
// HTML templates (attractor, kiosk, operator) with dynamic branding.

import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { eventContext } from "../middleware/eventContext.js";
import { boothKeyAuth } from "../middleware/boothKeyAuth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router({ mergeParams: true });

// GET /api/booth/:slug/config — full booth config (themes, branding, settings)
// Kiosk and operator pages call this on load to get everything they need.
router.get(
  "/config",
  eventContext({ includeBranding: true, includeThemes: true, requireLive: true }),
  boothKeyAuth,
  (req, res) => {
    const event = req.event;
    res.json({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        status: event.status,
        max_kiosks: event.max_kiosks,
        settings: event.settings,
      },
      branding: event.branding || {},
      themes: (event.themes || []).map((t) => ({
        id: t.id,
        name: t.name,
        mode: t.mode,
        background_url: t.background_url,
        overlay_url: t.overlay_url,
        sort_order: t.sort_order,
        is_default: t.is_default,
        // Note: gemini_prompt is intentionally NOT sent to the client
      })),
    });
  }
);

// GET /booth/:slug/attractor?key=BOOTH_KEY — idle attract screen
router.get(
  "/attractor",
  eventContext({ requireLive: true }),
  boothKeyAuth,
  (_req, res) => {
    res.sendFile(
      path.resolve(__dirname, "..", "..", "booth", "templates", "attractor.html")
    );
  }
);

// GET /booth/:slug/kiosk?key=BOOTH_KEY — photo capture screen
router.get(
  "/kiosk",
  eventContext({ requireLive: true }),
  boothKeyAuth,
  (_req, res) => {
    res.sendFile(
      path.resolve(__dirname, "..", "..", "booth", "templates", "kiosk.html")
    );
  }
);

// GET /booth/:slug/operator?key=BOOTH_KEY — operator controls
router.get(
  "/operator",
  eventContext({ requireLive: true }),
  boothKeyAuth,
  (_req, res) => {
    res.sendFile(
      path.resolve(__dirname, "..", "..", "booth", "templates", "operator.html")
    );
  }
);

export default router;
