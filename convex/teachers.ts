import { mutation, query } from "./secure";
import { v } from "convex/values";
import { logEvent } from "./activity";

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
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("teachers", args);
    await logEvent(ctx, "teacher.add", `Added teacher ${args.name} (${args.department})`, { entity: "teacher", entityId: id });
    return id;
  },
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
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
    const t = await ctx.db.get(id);
    await logEvent(ctx, "teacher.edit", `Edited teacher ${t?.name ?? "unknown"}`, { entity: "teacher", entityId: id });
  },
});

export const remove = mutation({
  args: { id: v.id("teachers") },
  handler: async (ctx, { id }) => {
    const t = await ctx.db.get(id);
    await ctx.db.delete(id);
    await logEvent(ctx, "teacher.remove", `Removed teacher ${t?.name ?? "unknown"}`, { entity: "teacher", entityId: id });
  },
});
