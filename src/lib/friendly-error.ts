import { ConvexError } from "convex/values";

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
    const m = e.message.match(/Uncaught (?:Convex)?Error:\s*([^\n]+)/);
    if (m) return m[1].trim();
  }
  return "Something went wrong. Please try again.";
}
