import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const books = await ctx.db.query("books").collect();
    const issues = await ctx.db.query("bookIssues").collect();
    return books.map((b) => ({
      ...b,
      issues: issues.filter((i) => i.bookId === b._id),
    }));
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    author: v.string(),
    category: v.string(),
    ageRange: v.string(),
    department: v.string(),
    coverUrl: v.optional(v.string()),
    copies: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("books", args);
  },
});

export const edit = mutation({
  args: {
    id: v.id("books"),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    category: v.optional(v.string()),
    ageRange: v.optional(v.string()),
    department: v.optional(v.string()),
    coverUrl: v.optional(v.string()),
    copies: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("books") },
  handler: async (ctx, { id }) => {
    // Remove issues
    const issues = await ctx.db.query("bookIssues").withIndex("by_book", (q) => q.eq("bookId", id)).collect();
    for (const i of issues) await ctx.db.delete(i._id);
    // Remove assignments
    const assignments = await ctx.db.query("assignments").withIndex("by_book", (q) => q.eq("bookId", id)).collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    await ctx.db.delete(id);
  },
});

export const addIssue = mutation({
  args: { bookId: v.id("books"), note: v.string() },
  handler: async (ctx, { bookId, note }) => {
    if (!note.trim()) return;
    await ctx.db.insert("bookIssues", { bookId, note: note.trim(), reportedAt: new Date().toISOString() });
  },
});

export const removeIssue = mutation({
  args: { issueId: v.id("bookIssues") },
  handler: async (ctx, { issueId }) => {
    await ctx.db.delete(issueId);
  },
});
