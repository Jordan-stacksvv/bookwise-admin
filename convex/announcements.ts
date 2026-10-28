import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAdmin, requireAdmin } from "./adminAuth";
import { isApproved } from "./access";
import { logEvent } from "./activity";

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
    const id = await ctx.db.insert("announcements", {
      title,
      body,
      audience: args.audience,
      expiresAt: args.expiresAt || undefined,
      createdAt: new Date().toISOString(),
      createdBy: who.name ?? who.email ?? "Admin",
    });
    await logEvent(ctx, "announcement.created", `Posted announcement "${title}" for ${args.audience.length ? args.audience.join(", ") : "every class"}`, { entity: "announcement", entityId: id });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const gone = await ctx.db.get(id);
    await ctx.db.delete(id);
    await logEvent(ctx, "announcement.removed", `Removed announcement "${gone?.title ?? "unknown"}"`, { entity: "announcement", entityId: id });
  },
});
