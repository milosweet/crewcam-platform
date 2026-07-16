// server/services/thumbnailService.js — Sharp-based thumbnail generation

import sharp from "sharp";

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;

/**
 * Generate a JPEG thumbnail from a buffer.
 * @param {Buffer} imageBuffer  Full-size image
 * @param {object} [options]
 * @param {number} [options.width]   Target width (default 400)
 * @param {number} [options.quality] JPEG quality 1-100 (default 80)
 * @returns {Promise<Buffer>}        Thumbnail buffer
 */
export async function generateThumbnail(imageBuffer, options = {}) {
  const { width = THUMB_WIDTH, quality = THUMB_QUALITY } = options;

  return sharp(imageBuffer)
    .resize(width, null, { withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
}

/**
 * Generate a thumbnail from a base64 data URL.
 * @param {string} dataUrl  e.g. "data:image/png;base64,..."
 * @returns {Promise<Buffer>}
 */
export async function thumbnailFromDataUrl(dataUrl) {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Invalid data URL for thumbnail");
  const buffer = Buffer.from(match[1], "base64");
  return generateThumbnail(buffer);
}
