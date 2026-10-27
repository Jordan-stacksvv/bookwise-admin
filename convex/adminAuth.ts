import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

const list = (name: string) =>
  (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/**
 * Who is calling, and are they an admin? Admin if ANY of these is true:
 *  - they are in the `admins` table (approved from Admin > Settings > Admins)
 *  - their Clerk user id is in the Convex env var ADMIN_USER_IDS (use this for the very first admin)
 *  - their verified email is in ADMIN_EMAILS (only works if the Clerk token includes the email claim)
 *  - the Clerk token carries role = "admin"
 */
export async function getAdmin(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return { signedIn: false, isAdmin: false, userId: null as string | null, email: null as string | null, name: null as string | null };
  }
  const claims = identity as unknown as Record<string, unknown>;
  const userId = identity.subject;
  const email = typeof identity.email === "string" ? identity.email.toLowerCase() : null;
  const verified = identity.emailVerified !== false;

  let isAdmin = claims.role === "admin" || list("ADMIN_USER_IDS").includes(userId.toLowerCase());
  if (!isAdmin && email && verified && list("ADMIN_EMAILS").includes(email)) isAdmin = true;
  if (!isAdmin) {
    const row = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    isAdmin = !!row;
  }
  return { signedIn: true, isAdmin, userId, email, name: identity.name ?? email };
}

export async function requireSignedIn(ctx: Ctx) {
  const a = await getAdmin(ctx);
  if (!a.signedIn) throw new ConvexError("Please sign in first.");
  return a;
}

export async function requireAdmin(ctx: Ctx) {
  const a = await requireSignedIn(ctx);
  if (!a.isAdmin) throw new ConvexError("Only admins can do this.");
  return a;
}

/** Used by the apps to decide what to show. */
export const me = query({
  args: {},
  handler: async (ctx) => getAdmin(ctx),
});
