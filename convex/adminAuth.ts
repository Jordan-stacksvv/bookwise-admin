import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** Comma-separated list in the Convex env var ADMIN_EMAILS. */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Who is calling, and are they an admin?
 * Admin = their (verified) email is in ADMIN_EMAILS, OR the Clerk JWT carries role = "admin"
 * (add the claim  "role": "{{user.public_metadata.role}}"  to the Clerk "convex" JWT template).
 */
export async function getAdmin(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return { signedIn: false, isAdmin: false, email: null as string | null, name: null as string | null };
  const claims = identity as unknown as Record<string, unknown>;
  const email = typeof identity.email === "string" ? identity.email.toLowerCase() : null;
  const verified = identity.emailVerified !== false;
  const byRole = claims.role === "admin";
  const byEmail = !!email && verified && adminEmails().includes(email);
  return { signedIn: true, isAdmin: byRole || byEmail, email, name: identity.name ?? email };
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

/** Used by the /admin app to decide what to show. */
export const me = query({
  args: {},
  handler: async (ctx) => getAdmin(ctx),
});
