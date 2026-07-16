// server/services/storageService.js — R2 upload/download/presign helpers
// All photos are organized by event: events/{eventId}/originals|rendered|thumbnails/{photoId}.jpg

import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import storage, { BUCKET, R2_PUBLIC_URL } from "../config/storage.js";

/**
 * Upload a buffer to R2.
 * @param {string} key      Object key, e.g. "events/{eventId}/originals/{photoId}.jpg"
 * @param {Buffer} buffer   File contents
 * @param {string} contentType  MIME type
 * @returns {Promise<string>}  Public or presigned URL
 */
export async function upload(key, buffer, contentType = "image/jpeg") {
  await storage.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return publicUrl(key);
}

/**
 * Upload a base64 data URL to R2.
 * @param {string} key       Object key
 * @param {string} dataUrl   e.g. "data:image/jpeg;base64,/9j/4AAQ..."
 * @returns {Promise<string>} URL
 */
export async function uploadDataUrl(key, dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Invalid data URL");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  return upload(key, buffer, contentType);
}

/**
 * Get a presigned download URL (valid for 1 hour).
 */
export async function getPresignedUrl(key, expiresIn = 3600) {
  return getSignedUrl(
    storage,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
}

/**
 * Delete an object from R2.
 */
export async function remove(key) {
  await storage.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  );
}

/**
 * Build the public URL for a key.
 * If R2_PUBLIC_URL is configured (custom domain or R2 public bucket URL), use that.
 * Otherwise fall back to presigned URL.
 */
export function publicUrl(key) {
  if (R2_PUBLIC_URL) {
    const base = R2_PUBLIC_URL.replace(/\/$/, "");
    return `${base}/${key}`;
  }
  // Without a public URL, callers should use getPresignedUrl() instead
  return null;
}

/**
 * Build R2 key paths for a photo.
 */
export function photoKeys(eventId, photoId) {
  const base = `events/${eventId}`;
  return {
    original: `${base}/originals/${photoId}.jpg`,
    rendered: `${base}/rendered/${photoId}.jpg`,
    thumbnail: `${base}/thumbnails/${photoId}.jpg`,
  };
}

/**
 * Build R2 key for an event asset (logo, theme background, overlay).
 */
export function assetKey(eventId, filename) {
  return `events/${eventId}/assets/${filename}`;
}
