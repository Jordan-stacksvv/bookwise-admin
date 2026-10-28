import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAdmin, requireAdmin } from "./adminAuth";
import { isApproved } from "./access";

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isApproved(ctx))) return [];
    return ctx.db.query("announcements").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    audience: v.array(v.string()), // empty = every class
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const who = await requireAdmin(ctx);
    const title = args.title.trim();
    const body = args.body.trim();
    if (!title) throw new ConvexError("Add a title.");
    if (!body) throw new ConvexError("Write the announcement.");
    if (title.length > 120) throw new ConvexError("Title is too long (120 characters max).");
    if (body.length > 2000) throw new ConvexError("Announcement is too long (2000 characters max).");
    return ctx.db.insert("announcements", {
      title,
      body,
      audience: args.audience,
      expiresAt: args.expiresAt || undefined,
      createdAt: new Date().toISOString(),
      createdBy: who.name ?? who.email ?? "Admin",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
