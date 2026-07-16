// server/utils/slugify.js — Turn a string into a URL-safe slug

/**
 * "Pharma Sailing Conference 2026" → "pharma-sailing-conference-2026"
 */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
