import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAdmin, requireAdmin, requireSignedIn } from "./adminAuth";

const clean = (s?: string, max = 120) => {
  const t = s?.trim();
  return t ? t.slice(0, max) : undefined;
};

/** A signed-in (non-admin) user asks to become an admin. An admin approves it in Settings. */
export const requestAccess = mutation({
  args: { name: v.optional(v.string()), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const who = await requireSignedIn(ctx);
    if (who.isAdmin) throw new ConvexError("You are already an admin.");
    const existing = await ctx.db.query("adminRequests").withIndex("by_user", (q) => q.eq("userId", who.userId!)).first();
    const doc = {
      userId: who.userId!,
      name: clean(args.name) ?? who.name ?? undefined,
      email: clean(args.email) ?? who.email ?? undefined, // typed by the browser: an admin decides by looking at it
      createdAt: new Date().toISOString(),
    };
    if (existing) await ctx.db.replace(existing._id, doc);
    else await ctx.db.insert("adminRequests", doc);
  },
});

/** Has the caller already asked? (shown on the "Admins only" screen) */
export const myRequest = query({
  args: {},
  handler: async (ctx) => {
    const who = await getAdmin(ctx);
    if (!who.signedIn) return null;
    return ctx.db.query("adminRequests").withIndex("by_user", (q) => q.eq("userId", who.userId!)).first();
  },
});

export const listRequests = query({
  args: {},
  handler: async (ctx) => {
    const who = await getAdmin(ctx);
    if (!who.isAdmin) return [];
    return ctx.db.query("adminRequests").order("desc").collect();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const who = await getAdmin(ctx);
    if (!who.isAdmin) return [];
    return ctx.db.query("admins").order("desc").collect();
  },
});

export const approve = mutation({
  args: { id: v.id("adminRequests") },
  handler: async (ctx, { id }) => {
    const who = await requireAdmin(ctx);
    const r = await ctx.db.get(id);
    if (!r) throw new ConvexError("That request no longer exists.");
    const already = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", r.userId)).first();
    if (!already) {
      await ctx.db.insert("admins", {
        userId: r.userId,
        name: r.name,
        email: r.email,
        addedBy: who.name ?? who.email ?? "Admin",
        createdAt: new Date().toISOString(),
      });
    }
    await ctx.db.delete(id);
  },
});

export const decline = mutation({
  args: { id: v.id("adminRequests") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});

export const remove = mutation({
  args: { id: v.id("admins") },
  handler: async (ctx, { id }) => {
    const who = await requireAdmin(ctx);
    const row = await ctx.db.get(id);
    if (!row) return;
    if (row.userId === who.userId) throw new ConvexError("You cannot remove yourself.");
    await ctx.db.delete(id);
  },
});
