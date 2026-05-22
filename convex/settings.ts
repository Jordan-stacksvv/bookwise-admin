import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEFAULTS = {
  categories: ["Spiritual", "Bible Stories", "Stories", "Allegory", "Devotional", "History"],
  departments: ["Beginners", "Primary", "Juniors", "Earliteens", "Youth"],
  ageRanges: ["3-5", "4-7", "6-10", "8-12", "10-14", "12-16", "14-18"],
};

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).first();
    return row?.values ?? DEFAULTS[key as keyof typeof DEFAULTS] ?? [];
  },
});

export const add = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const v2 = value.trim();
    if (!v2) return;
    const existing = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).first();
    const defaults = DEFAULTS[key as keyof typeof DEFAULTS] ?? [];
    const current = existing?.values ?? defaults;
    if (current.includes(v2)) return;
    const next = [...current, v2];
    if (existing) await ctx.db.patch(existing._id, { values: next });
    else await ctx.db.insert("settings", { key, values: next });
  },
});

export const remove = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).first();
    const defaults = DEFAULTS[key as keyof typeof DEFAULTS] ?? [];
    const current = existing?.values ?? defaults;
    const next = current.filter((v3: string) => v3 !== value);
    if (existing) await ctx.db.patch(existing._id, { values: next });
    else await ctx.db.insert("settings", { key, values: next });
  },
});
