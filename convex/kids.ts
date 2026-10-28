import { mutation, query } from "./secure";
import { v } from "convex/values";
import { logEvent } from "./activity";

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
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("kids", args);
    await logEvent(ctx, "kid.add", `Added kid ${args.name} (${args.department})`, { entity: "kid", entityId: id });
    return id;
  },
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
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
    const k = await ctx.db.get(id);
    await logEvent(ctx, "kid.edit", `Edited kid ${k?.name ?? "unknown"}`, { entity: "kid", entityId: id });
  },
});

export const remove = mutation({
  args: { id: v.id("kids") },
  handler: async (ctx, { id }) => {
    const gone = await ctx.db.get(id);
    const assignments = await ctx.db.query("assignments").withIndex("by_kid", (q) => q.eq("kidId", id)).collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    await ctx.db.delete(id);
    await logEvent(ctx, "kid.remove", `Removed kid ${gone?.name ?? "unknown"} and their loans`, { entity: "kid", entityId: id });
  },
});
