import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Shared CRUD across categories / departments / ageRanges

export const listCategories = query({ args: {}, handler: (ctx) => ctx.db.query("categories").collect() });
export const listDepartments = query({ args: {}, handler: (ctx) => ctx.db.query("departments").collect() });
export const listAgeRanges = query({ args: {}, handler: (ctx) => ctx.db.query("ageRanges").collect() });

export const addCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const existing = await ctx.db.query("categories").withIndex("by_name", (q) => q.eq("name", name)).first();
    if (existing) return existing._id;
    return ctx.db.insert("categories", { name });
  },
});

export const addDepartment = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const existing = await ctx.db.query("departments").withIndex("by_name", (q) => q.eq("name", name)).first();
    if (existing) return existing._id;
    return ctx.db.insert("departments", { name });
  },
});

export const addAgeRange = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const existing = await ctx.db.query("ageRanges").withIndex("by_name", (q) => q.eq("name", name)).first();
    if (existing) return existing._id;
    return ctx.db.insert("ageRanges", { name });
  },
});

export const removeCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, { id }) => {
    const cat = await ctx.db.get(id);
    if (!cat) return;
    const inUse = await ctx.db.query("books").filter((q) => q.eq(q.field("category"), cat.name)).first();
    if (inUse) throw new Error("Category is in use");
    await ctx.db.delete(id);
  },
});

export const removeDepartment = mutation({
  args: { id: v.id("departments") },
  handler: async (ctx, { id }) => {
    const d = await ctx.db.get(id);
    if (!d) return;
    const inBooks = await ctx.db.query("books").withIndex("by_department", (q) => q.eq("department", d.name)).first();
    const inKids = await ctx.db.query("kids").withIndex("by_department", (q) => q.eq("department", d.name)).first();
    const inTeach = await ctx.db.query("teachers").withIndex("by_department", (q) => q.eq("department", d.name)).first();
    if (inBooks || inKids || inTeach) throw new Error("Department is in use");
    await ctx.db.delete(id);
  },
});

export const removeAgeRange = mutation({
  args: { id: v.id("ageRanges") },
  handler: async (ctx, { id }) => {
    const a = await ctx.db.get(id);
    if (!a) return;
    const inUse = await ctx.db.query("books").filter((q) => q.eq(q.field("ageRange"), a.name)).first();
    if (inUse) throw new Error("Age range is in use");
    await ctx.db.delete(id);
  },
});
