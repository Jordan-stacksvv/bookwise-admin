import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAdmin, requireAdmin, requireSignedIn } from "./adminAuth";

const HOUR = 3600 * 1000;
const clean = (s?: string, max = 120) => {
  const t = s?.trim();
  return t ? t.slice(0, max) : undefined;
};
const envIds = () =>
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/**
 * Every signed-in person is recorded once (name, email, photo, the role they picked on the login page),
 * so admins can see who is using the app and promote teachers. Called when the app opens.
 */
export const sync = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(v.union(v.literal("teacher"), v.literal("admin"))),
  },
  handler: async (ctx, args) => {
    const who = await requireSignedIn(ctx);
    const row = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", who.userId!)).first();
    const now = new Date().toISOString();
    const image = args.imageUrl && /^https:\/\//.test(args.imageUrl) ? args.imageUrl.slice(0, 500) : undefined;
    const next = {
      name: clean(args.name) ?? who.name ?? undefined,
      email: clean(args.email) ?? who.email ?? undefined,
      imageUrl: image,
      role: args.role ?? row?.role,
    };
    if (!row) {
      await ctx.db.insert("members", { userId: who.userId!, ...next, createdAt: now, lastSeenAt: now });
      return;
    }
    const changed = row.name !== next.name || row.email !== next.email || row.imageUrl !== next.imageUrl || row.role !== next.role;
    const stale = Date.now() - Date.parse(row.lastSeenAt) > HOUR;
    if (changed || stale) await ctx.db.patch(row._id, { ...next, lastSeenAt: now });
  },
});

/** Admins only: everyone who has signed in, with whether they are an admin. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const who = await getAdmin(ctx);
    if (!who.isAdmin) return [];
    const [members, adminRows] = await Promise.all([ctx.db.query("members").collect(), ctx.db.query("admins").collect()]);
    const inTable = new Set(adminRows.map((r) => r.userId));
    const env = new Set(envIds());
    return members
      .map((m) => {
        const fromServer = env.has(m.userId.toLowerCase());
        return { ...m, isAdmin: fromServer || inTable.has(m.userId), fromServerSetting: fromServer, isYou: m.userId === who.userId };
      })
      .sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin) || b.lastSeenAt.localeCompare(a.lastSeenAt));
  },
});

export const makeAdmin = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const who = await requireAdmin(ctx);
    const m = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!m) throw new ConvexError("That person has not signed in yet.");
    const existing = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!existing) {
      await ctx.db.insert("admins", {
        userId,
        name: m.name,
        email: m.email,
        addedBy: who.name ?? who.email ?? "Admin",
        createdAt: new Date().toISOString(),
      });
    }
    const reqs = await ctx.db.query("adminRequests").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const r of reqs) await ctx.db.delete(r._id);
  },
});

export const removeAdmin = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const who = await requireAdmin(ctx);
    if (userId === who.userId) throw new ConvexError("You cannot remove yourself.");
    if (envIds().includes(userId.toLowerCase())) throw new ConvexError("This admin is set in the server settings and cannot be removed here.");
    const rows = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const r of rows) await ctx.db.delete(r._id);
  },
});
