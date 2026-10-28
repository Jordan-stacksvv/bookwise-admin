import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { getAdmin } from "./adminAuth";

type Ctx = QueryCtx | MutationCtx;

export type AccessStatus = "none" | "pending" | "approved" | "denied" | "admin";

/**
 * Can this caller use the app?
 *  - admin    : an admin (always allowed)
 *  - approved : an admin approved them as a teacher
 *  - pending  : signed in, waiting for an admin (also: signed in but not recorded yet = "none")
 *  - denied   : an admin said no
 * People recorded before approvals existed (no status) count as pending.
 */
export async function getAccess(ctx: Ctx) {
  const who = await getAdmin(ctx);
  if (!who.signedIn) return { ...who, approved: false, status: "none" as AccessStatus, member: null };
  const member = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", who.userId!)).first();
  if (who.isAdmin) return { ...who, approved: true, status: "admin" as AccessStatus, member };
  const status: AccessStatus = member ? (member.status ?? "pending") : "none";
  return { ...who, approved: status === "approved", status, member };
}

export async function isApproved(ctx: Ctx): Promise<boolean> {
  return (await getAccess(ctx)).approved;
}

export async function requireApproved(ctx: Ctx) {
  const a = await getAccess(ctx);
  if (!a.signedIn) throw new ConvexError("Please sign in first.");
  if (!a.approved) throw new ConvexError("Your account is waiting for approval.");
  return a;
}

/** What the app shows right after sign-in: the app, a "waiting for approval" screen, or "no access". */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const a = await getAccess(ctx);
    return {
      signedIn: a.signedIn,
      userId: a.userId,
      isAdmin: a.isAdmin,
      status: a.status,
      requestedRole: a.member?.role ?? null,
      name: a.member?.name ?? a.name,
    };
  },
});
