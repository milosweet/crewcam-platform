// server/middleware/rateLimiter.js — Simple in-memory rate limiter

/**
 * Creates a rate-limiting middleware.
 * @param {Object} opts
 * @param {number} opts.windowMs — Time window in milliseconds (default 60 000)
 * @param {number} opts.max      — Max requests per window (default 30)
 * @param {string} opts.message  — Error message sent on limit
 */
export function rateLimit({ windowMs = 60_000, max = 30, message = "Too many requests, please try again later." } = {}) {
  const hits = new Map();

  // Sweep expired entries every windowMs to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  interval.unref(); // don't keep process alive for cleanup

  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      hits.set(key, entry);
    }

    entry.count++;

    // Set standard rate-limit headers
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - entry.count));

    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}
