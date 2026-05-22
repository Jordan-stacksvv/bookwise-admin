import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("assignments").collect(),
});

export const assign = mutation({
  args: {
    bookId: v.id("books"),
    kidId: v.id("kids"),
    teacherId: v.optional(v.id("teachers")),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("assignments", {
      ...args,
      assignedAt: new Date().toISOString(),
    });
  },
});

export const returnBook = mutation({
  args: { id: v.id("assignments") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { returnedAt: new Date().toISOString() });
  },
});

export const update = mutation({
  args: {
    id: v.id("assignments"),
    currentPage: v.optional(v.number()),
    completed: v.optional(v.boolean()),
    returnedAt: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});
