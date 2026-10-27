"use strict";
/** Files that more than one patch needs. create() is a no-op when content is identical. */
const { create } = require("./_lib.cjs");

const FRIENDLY_ERROR = `import { ConvexError } from "convex/values";

/**
 * Turns an error thrown by a Convex function into a message safe to show.
 * On production deployments Convex hides plain Error messages, so server code
 * throws ConvexError("...") for anything the user should read.
 */
export function friendlyError(e: unknown): string {
  if (e instanceof ConvexError) {
    return typeof e.data === "string" ? e.data : "Something went wrong. Please try again.";
  }
  if (e instanceof Error) {
    const m = e.message.match(/Uncaught (?:Convex)?Error:\\s*([^\\n]+)/);
    if (m) return m[1].trim();
  }
  return "Something went wrong. Please try again.";
}
`;

const PHONE = `/** Normalises a Ghana number to 233XXXXXXXXX for wa.me links, or null if it doesn't look valid. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (/^0\\d{9}$/.test(digits)) return "233" + digits.slice(1);
  if (/^233\\d{9}$/.test(digits)) return digits;
  return null;
}
`;

module.exports = {
  ensureFriendlyError: () => create("src/lib/friendly-error.ts", FRIENDLY_ERROR),
  ensurePhone: () => create("src/lib/phone.ts", PHONE),
};
