// server/index.js — CrewCam Platform entry point

import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./config/database.js";
import { requestLogger, errorHandler } from "./middleware/errorHandler.js";

// ── Route imports ─────────────────────────────────────────
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import themeRoutes from "./routes/themes.js";
import brandingRoutes from "./routes/branding.js";
import photoRoutes from "./routes/photos.js";
import boothRoutes from "./routes/booth.js";
import galleryRoutes from "./routes/gallery.js";
import analyticsRoutes from "./routes/analytics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(requestLogger);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS — allow booth frontends to call the API
app.use((req, res, next) => {
  const origin = process.env.ALLOWED_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Booth-Key");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// ── Health check (unkeyed for uptime probes) ───────────────
app.get("/api/health", async (_req, res) => {
  try {
    const dbCheck = await query("SELECT 1");
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: dbCheck ? "connected" : "error",
      version: "1.0.0",
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: err.message,
    });
  }
});

// ── API Routes ────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/events/:slug/themes", themeRoutes);
app.use("/api/events/:slug/branding", brandingRoutes);

// ── Analytics (admin auth) ────────────────────────────────
app.use("/api", analyticsRoutes);

// ── Booth & Photo Routes (booth key auth) ─────────────────
app.use("/api/booth/:slug", photoRoutes);

// ── Booth Frontend Serving ────────────────────────────────
app.use("/api/booth/:slug", boothRoutes);   // GET /api/booth/:slug/config
app.use("/booth/:slug", boothRoutes);        // GET /booth/:slug/attractor|kiosk|operator

// ── Gallery & Photo Share (public, no auth) ──────────────
app.use(galleryRoutes);

// ── Serve booth static assets (CSS, JS) ───────────────────
const boothStatic = path.join(__dirname, "..", "booth");
app.use("/booth/assets", express.static(path.join(boothStatic, "css")));
app.use("/booth/assets", express.static(path.join(boothStatic, "js")));
app.use("/booth/assets", express.static(path.join(boothStatic, "assets")));

// ── Serve admin dashboard (after build) ────────────────────
const adminDist = path.join(__dirname, "..", "admin", "dist");
app.use("/admin", express.static(adminDist));
// SPA fallback for admin routes
app.get("/admin/*", (_req, res) => {
  res.sendFile(path.join(adminDist, "index.html"));
});

// ── Global error handler (must be last middleware) ────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────
const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`CrewCam Platform running on http://localhost:${port}`);
  console.log(`  Health: http://localhost:${port}/api/health`);
  console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
