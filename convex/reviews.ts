import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("bookReviews").collect(),
});

export const listByKid = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, { kidId }) =>
    ctx.db.query("bookReviews").withIndex("by_kid", (q) => q.eq("kidId", kidId)).collect(),
});

export const add = mutation({
  args: {
    assignmentId: v.id("assignments"),
    kidId: v.id("kids"),
    bookId: v.id("books"),
    chapterRange: v.optional(v.string()),
    summary: v.string(),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("bookReviews", { ...args, createdAt: new Date().toISOString() }),
});

export const markSent = mutation({
  args: { id: v.id("bookReviews") },
  handler: async (ctx, { id }) => ctx.db.patch(id, { sentToParentAt: new Date().toISOString() }),
});

export const remove = mutation({
  args: { id: v.id("bookReviews") },
  handler: async (ctx, { id }) => ctx.db.delete(id),
});

