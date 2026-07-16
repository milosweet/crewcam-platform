// server/utils/shareCode.js — Generate unique 8-character share codes for photos

import crypto from "crypto";
import { SHARE_CODE_LENGTH } from "../../shared/constants.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/**
 * Generate a random share code (no ambiguous chars like 0/O, 1/l/I).
 * @returns {string} e.g. "kR7xP4mN"
 */
export function generateShareCode() {
  const bytes = crypto.randomBytes(SHARE_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
