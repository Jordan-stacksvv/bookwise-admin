import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("kids").collect(),
});

export const add = mutation({
  args: {
    name: v.string(),
    age: v.number(),
    department: v.string(),
    birthdate: v.optional(v.string()),
    parentName: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("kids", args),
});

export const edit = mutation({
  args: {
    id: v.id("kids"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    department: v.optional(v.string()),
    birthdate: v.optional(v.string()),
    parentName: v.optional(v.string()),
    parentPhone: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => ctx.db.patch(id, updates),
});

export const remove = mutation({
  args: { id: v.id("kids") },
  handler: async (ctx, { id }) => {
    const assignments = await ctx.db.query("assignments").withIndex("by_kid", (q) => q.eq("kidId", id)).collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    await ctx.db.delete(id);
  },
});
