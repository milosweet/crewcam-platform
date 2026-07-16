// server/middleware/errorHandler.js — Global error handling + async wrapper

/**
 * Wrap an async route handler so thrown errors reach the Express error handler.
 * Usage: router.get("/path", asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Simple request logger — method, path, status, duration.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
    console.log(`[${level}] ${req.method} ${req.originalUrl} ${status} ${ms}ms`);
  });
  next();
}

/**
 * Global error handler — must be registered AFTER all routes.
 * Sends a consistent JSON error response.
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? "Internal server error" : err.message || "Something went wrong";

  if (status >= 500) {
    console.error(`[ERROR] ${err.message}`);
    if (err.stack) console.error(err.stack);
  }

  res.status(status).json({ error: message });
}
