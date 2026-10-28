import { mutation, query } from "./secure";
import { v, ConvexError } from "convex/values";
import { logEvent } from "./activity";

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
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { code: rawCode, ...rest } = args;
    const code = rawCode?.trim();
    if (code) {
      const dup = await ctx.db.query("books").withIndex("by_code", (q) => q.eq("code", code)).first();
      if (dup) throw new ConvexError(`Book code "${code}" is already used by "${dup.title}".`);
    }
    const id = await ctx.db.insert("books", code ? { ...rest, code } : rest);
    await logEvent(ctx, "book.add", `Added book "${args.title}"${code ? ` (${code})` : ""}`, { entity: "book", entityId: id });
    return id;
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
    code: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    if (updates.code !== undefined) {
      const code = updates.code.trim();
      if (code) {
        const dup = await ctx.db.query("books").withIndex("by_code", (q) => q.eq("code", code)).first();
        if (dup && dup._id !== id) throw new ConvexError(`Book code "${code}" is already used by "${dup.title}".`);
      }
      updates.code = code || undefined; // empty string clears the code
    }
    await ctx.db.patch(id, updates);
    const edited = await ctx.db.get(id);
    await logEvent(ctx, "book.edit", `Edited book "${edited?.title ?? "unknown"}"`, { entity: "book", entityId: id });
  },
});

export const remove = mutation({
  args: { id: v.id("books") },
  handler: async (ctx, { id }) => {
    const gone = await ctx.db.get(id);
    // Remove issues
    const issues = await ctx.db.query("bookIssues").withIndex("by_book", (q) => q.eq("bookId", id)).collect();
    for (const i of issues) await ctx.db.delete(i._id);
    // Remove assignments
    const assignments = await ctx.db.query("assignments").withIndex("by_book", (q) => q.eq("bookId", id)).collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    await ctx.db.delete(id);
    await logEvent(ctx, "book.remove", `Removed book "${gone?.title ?? "unknown"}" and its loans`, { entity: "book", entityId: id });
  },
});

export const addIssue = mutation({
  args: { bookId: v.id("books"), note: v.string() },
  handler: async (ctx, { bookId, note }) => {
    if (!note.trim()) return;
    await ctx.db.insert("bookIssues", { bookId, note: note.trim(), reportedAt: new Date().toISOString() });
    const issueBook = await ctx.db.get(bookId);
    await logEvent(ctx, "book.issue", `Reported a problem with "${issueBook?.title ?? "a book"}": ${note.trim().slice(0, 120)}`, { entity: "book", entityId: bookId });
  },
});

export const removeIssue = mutation({
  args: { issueId: v.id("bookIssues") },
  handler: async (ctx, { issueId }) => {
    await ctx.db.delete(issueId);
    await logEvent(ctx, "book.issue_removed", "Cleared a reported book problem", { entity: "book" });
  },
});
