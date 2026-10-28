import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAdmin, requireAdmin } from "./adminAuth";
import { isApproved } from "./access";

/** A book the admin has set for a whole class to read. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isApproved(ctx))) return [];
    return ctx.db.query("readingSets").order("desc").collect();
  },
});

export const create = mutation({
  args: {
    bookId: v.id("books"),
    department: v.string(),
    dueDate: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const who = await requireAdmin(ctx);
    if (!(await ctx.db.get(args.bookId))) throw new ConvexError("Book not found.");
    const department = args.department.trim();
    if (!department) throw new ConvexError("Choose a class.");
    const note = args.note?.trim();
    if (note && note.length > 500) throw new ConvexError("Note is too long (500 characters max).");
    const existing = await ctx.db.query("readingSets").collect();
    if (existing.some((r) => r.bookId === args.bookId && r.department === department)) {
      throw new ConvexError("That book is already set for this class.");
    }
    return ctx.db.insert("readingSets", {
      bookId: args.bookId,
      department,
      dueDate: args.dueDate || undefined,
      note: note || undefined,
      createdAt: new Date().toISOString(),
      createdBy: who.name ?? who.email ?? "Admin",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("readingSets") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    await ctx.db.delete(id);
  },
});
