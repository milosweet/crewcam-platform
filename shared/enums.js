// shared/enums.js — shared constants for status values, roles, and modes

export const EVENT_STATUS = {
  DRAFT: "draft",
  LIVE: "live",
  ARCHIVED: "archived",
};

export const USER_ROLE = {
  ADMIN: "admin",
  OPERATOR: "operator",
};

export const THEME_MODE = {
  FUN: "fun",
  CORPORATE: "corporate",
  HEADSHOT: "headshot",
  GROUP: "group",
};

export const PHOTO_STATUS = {
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
};

export const ANALYTICS_ACTION = {
  PHOTO_TAKEN: "photo_taken",
  QR_SCANNED: "qr_scanned",
  DOWNLOADED: "downloaded",
  GALLERY_VIEWED: "gallery_viewed",
};
