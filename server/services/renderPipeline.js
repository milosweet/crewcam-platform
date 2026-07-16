// server/services/renderPipeline.js — Full photo capture → render → store pipeline
// Ported from the existing CrewCam backend, adapted for multi-tenant with R2 storage.

import { query } from "../config/database.js";
import { renderScene } from "../config/gemini.js";
import { uploadDataUrl, upload, photoKeys } from "./storageService.js";
import { thumbnailFromDataUrl } from "./thumbnailService.js";
import { generateShareCode } from "../utils/shareCode.js";
import { DEFAULT_ASPECT_RATIO } from "../../shared/constants.js";

/**
 * Process a photo capture: render with Gemini, store in R2, generate thumbnail.
 * Runs asynchronously — the caller creates the photo row with status 'processing',
 * then this function updates it to 'done' or 'failed'.
 *
 * @param {object} params
 * @param {string} params.photoId       UUID of the photo row (already created)
 * @param {string} params.eventId       Event UUID
 * @param {string} params.photoDataUrl  Raw guest photo as base64 data URL
 * @param {string} params.prompt        Gemini prompt from the selected theme
 * @param {string} [params.aspectRatio] Default "3:4"
 */
export async function processPhoto({ photoId, eventId, photoDataUrl, prompt, aspectRatio }) {
  const keys = photoKeys(eventId, photoId);

  try {
    // 1. Upload original to R2
    const originalUrl = await uploadDataUrl(keys.original, photoDataUrl);

    await query(
      "UPDATE photos SET original_url = $1 WHERE id = $2",
      [originalUrl, photoId]
    );

    // 2. Render with Gemini
    const { dataUrl: renderedDataUrl } = await renderScene({
      photoDataUrl,
      prompt,
      aspectRatio: aspectRatio || DEFAULT_ASPECT_RATIO,
    });

    // 3. Upload rendered image to R2
    const renderedUrl = await uploadDataUrl(keys.rendered, renderedDataUrl);

    // 4. Generate and upload thumbnail
    const thumbBuffer = await thumbnailFromDataUrl(renderedDataUrl);
    const thumbnailUrl = await upload(keys.thumbnail, thumbBuffer, "image/jpeg");

    // 5. Generate share code
    const shareCode = await generateUniqueShareCode();

    // 6. Update photo row as done
    await query(
      `UPDATE photos SET
        rendered_url = $1,
        thumbnail_url = $2,
        share_code = $3,
        status = 'done'
       WHERE id = $4`,
      [renderedUrl, thumbnailUrl, shareCode, photoId]
    );

    return { status: "done", renderedUrl, thumbnailUrl, shareCode };
  } catch (err) {
    // Mark as failed with error message
    await query(
      "UPDATE photos SET status = 'failed', error_message = $1 WHERE id = $2",
      [String(err.message || err).slice(0, 500), photoId]
    ).catch(() => {}); // don't throw on the update itself

    console.error(`Render failed for photo ${photoId}:`, err);
    return { status: "failed", error: err.message };
  }
}

/**
 * Generate a share code that doesn't collide with existing ones.
 */
async function generateUniqueShareCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateShareCode();
    const existing = await query(
      "SELECT id FROM photos WHERE share_code = $1",
      [code]
    );
    if (existing.rows.length === 0) return code;
  }
  // Extremely unlikely fallback — 10 collisions in a row
  throw new Error("Could not generate unique share code");
}
