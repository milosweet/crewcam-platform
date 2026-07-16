// server/config/storage.js — Cloudflare R2 (S3-compatible) client

import { S3Client } from "@aws-sdk/client-s3";

const storage = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME || "crewcam-storage";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export default storage;
