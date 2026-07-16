// theme-loader.js — Fetch event config and apply branding dynamically.
// Reads the event slug and booth key from the URL, fetches /api/booth/:slug/config,
// and injects CSS custom properties + updates DOM elements.

(function () {
  "use strict";

  // Parse slug and key from the URL.
  // Supports both /booth/:slug/kiosk?key=XXX and setting them via data attributes on <script>.
  const scriptTag = document.currentScript;
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const SLUG =
    scriptTag?.dataset.slug ||
    (pathParts[0] === "booth" ? pathParts[1] : null) ||
    new URLSearchParams(window.location.search).get("slug");

  const BOOTH_KEY =
    scriptTag?.dataset.key ||
    new URLSearchParams(window.location.search).get("key") || "";

  if (!SLUG) {
    console.error("[theme-loader] No event slug found in URL or script data attributes.");
    return;
  }

  // Expose globally so booth-client.js and page scripts can use them.
  window.__crewcam = { slug: SLUG, boothKey: BOOTH_KEY, config: null };

  /**
   * Fetch the event config from the API.
   */
  async function loadConfig() {
    const base = window.location.origin;
    const url = `${base}/api/booth/${SLUG}/config`;
    const headers = {};
    if (BOOTH_KEY) headers["X-Booth-Key"] = BOOTH_KEY;

    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
      const data = await res.json();
      window.__crewcam.config = data;
      applyBranding(data);
      applyContent(data);
      document.dispatchEvent(new CustomEvent("crewcam:config", { detail: data }));
      return data;
    } catch (err) {
      console.error("[theme-loader] Failed to load config:", err);
      document.dispatchEvent(new CustomEvent("crewcam:config-error", { detail: err }));
      return null;
    }
  }

  /**
   * Apply branding colors as CSS custom properties.
   */
  function applyBranding(data) {
    const b = data.branding || {};
    const root = document.documentElement.style;

    if (b.primary_color) {
      root.setProperty("--brand-primary", b.primary_color);
      // Derive a subtle line color from primary
      root.setProperty("--line", hexToRgba(b.primary_color, 0.22));
    }
    if (b.secondary_color) {
      root.setProperty("--brand-secondary", b.secondary_color);
    }
  }

  /**
   * Apply content — logo, headings, event name.
   */
  function applyContent(data) {
    const b = data.branding || {};
    const event = data.event || {};

    // Logo
    if (b.logo_url) {
      document.querySelectorAll("[data-brand='logo']").forEach((el) => {
        if (el.tagName === "IMG") {
          el.src = b.logo_url;
          el.style.display = "";
        }
      });
    }

    // Attractor heading / subheading
    if (b.attractor_heading) {
      document.querySelectorAll("[data-brand='heading']").forEach((el) => {
        el.textContent = b.attractor_heading;
      });
    }
    if (b.attractor_subheading) {
      document.querySelectorAll("[data-brand='subheading']").forEach((el) => {
        el.textContent = b.attractor_subheading;
      });
    }

    // Event name (for page titles, etc.)
    if (event.name) {
      document.querySelectorAll("[data-brand='event-name']").forEach((el) => {
        el.textContent = event.name;
      });
      document.title = `${event.name} — CrewCam`;
    }

    // Gallery footer
    if (b.gallery_footer_text) {
      document.querySelectorAll("[data-brand='footer']").forEach((el) => {
        el.textContent = b.gallery_footer_text;
      });
    }
  }

  /**
   * Convert hex color to rgba string.
   */
  function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // --- Helpers exposed for page scripts ---

  /** Build a URL to the booth API, scoped to this event. */
  window.__crewcam.apiUrl = function (path) {
    return `${window.location.origin}/api/booth/${SLUG}${path}`;
  };

  /** Return headers including the booth key. */
  window.__crewcam.headers = function (extra) {
    const h = { "Content-Type": "application/json" };
    if (BOOTH_KEY) h["X-Booth-Key"] = BOOTH_KEY;
    return Object.assign(h, extra || {});
  };

  // Load config on DOMContentLoaded (or immediately if already loaded).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadConfig);
  } else {
    loadConfig();
  }
})();
