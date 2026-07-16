// server/services/qrService.js — QR code generation for photo share links

import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL (PNG).
 * @param {string} shareCode   The photo's unique share code
 * @param {object} [options]
 * @param {number} [options.width]  QR code width in pixels (default 300)
 * @returns {Promise<string>}       Data URL string
 */
export async function generateQRDataUrl(shareCode, options = {}) {
  const { width = 300 } = options;
  const publicUrl = process.env.PUBLIC_URL || "http://localhost:8787";
  const url = `${publicUrl.replace(/\/$/, "")}/photo/${shareCode}`;

  return QRCode.toDataURL(url, {
    width,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

/**
 * Generate a QR code as a Buffer (PNG).
 * @param {string} shareCode
 * @param {object} [options]
 * @returns {Promise<Buffer>}
 */
export async function generateQRBuffer(shareCode, options = {}) {
  const { width = 300 } = options;
  const publicUrl = process.env.PUBLIC_URL || "http://localhost:8787";
  const url = `${publicUrl.replace(/\/$/, "")}/photo/${shareCode}`;

  return QRCode.toBuffer(url, {
    width,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
