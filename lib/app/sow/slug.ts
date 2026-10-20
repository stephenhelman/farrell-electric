import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const SOW_SLUG_LENGTH = 10;
export const SOW_SLUG_ATTEMPTS = 5;

/** 10-char base62 slug (~59 bits). Rejection sampling keeps the distribution uniform. */
export function generateSowSlug(): string {
  let out = "";
  while (out.length < SOW_SLUG_LENGTH) {
    for (const byte of randomBytes(SOW_SLUG_LENGTH * 2)) {
      if (byte < 248 && out.length < SOW_SLUG_LENGTH) out += ALPHABET[byte % 62];
    }
  }
  return out;
}
