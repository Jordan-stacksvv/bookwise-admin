import { mutation, query } from "./secure";
import { v, ConvexError } from "convex/values";
import { MIN_BORROW_AGE, ageOn } from "./policy";
import { newToken } from "./loanHelpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("assignments").collect();
    // The parent-approval token is a secret link: only signed-in users get it.
    if (await ctx.auth.getUserIdentity()) return rows;
    return rows.map(({ approvalToken: _t, ...rest }) => rest);
  },
});

export const assign = mutation({
  args: {
    bookId: v.id("books"),
    kidId: v.id("kids"),
    teacherId: v.optional(v.id("teachers")),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    const kid = await ctx.db.get(args.kidId);
    if (!kid) throw new ConvexError("Kid not found.");
    if (ageOn(kid) < MIN_BORROW_AGE) {
      throw new ConvexError(`${kid.name} is under ${MIN_BORROW_AGE} and cannot borrow books yet.`);
    }
    const book = await ctx.db.get(args.bookId);
    if (!book) throw new ConvexError("Book not found.");
    // New loans wait for the parent (link sent by WhatsApp), then for the admin.
    const token = newToken();
    const id = await ctx.db.insert("assignments", {
      ...args,
      assignedAt: new Date().toISOString(),
      status: "pending_parent",
      approvalToken: token,
    });
    return {
      id,
      token,
      kidName: kid.name,
      parentName: kid.parentName,
      parentPhone: kid.parentPhone,
      bookTitle: book.title,
      dueDate: args.dueDate,
    };
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
