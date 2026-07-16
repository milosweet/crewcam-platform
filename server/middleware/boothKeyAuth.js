// server/middleware/boothKeyAuth.js — Verify per-event booth key
// The booth key can come from the X-Booth-Key header or ?key= query param.
// Requires eventContext middleware to have run first (req.event must exist).

import { BOOTH_KEY_HEADER } from "../../shared/constants.js";

export function boothKeyAuth(req, res, next) {
  const event = req.event;
  if (!event) {
    return res.status(500).json({ error: "Event context not loaded" });
  }

  const key =
    req.headers[BOOTH_KEY_HEADER] ||
    req.headers["X-Booth-Key"] ||
    req.query.key;

  if (!key || key !== event.booth_key) {
    return res.status(401).json({ error: "Invalid or missing booth key" });
  }

  next();
}
