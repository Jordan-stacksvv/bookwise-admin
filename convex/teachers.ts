import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("teachers").collect(),
});

export const add = mutation({
  args: {
    name: v.string(),
    department: v.string(),
    className: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => ctx.db.insert("teachers", args),
});

export const edit = mutation({
  args: {
    id: v.id("teachers"),
    name: v.optional(v.string()),
    department: v.optional(v.string()),
    className: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => ctx.db.patch(id, updates),
});

export const remove = mutation({
  args: { id: v.id("teachers") },
  handler: async (ctx, { id }) => ctx.db.delete(id),
});
