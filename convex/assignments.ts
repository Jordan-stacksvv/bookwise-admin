import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { MIN_BORROW_AGE, ageOn } from "./policy";

export const list = query({
  args: {},
  handler: async (ctx) => ctx.db.query("assignments").collect(),
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
    return ctx.db.insert("assignments", {
      ...args,
      assignedAt: new Date().toISOString(),
    });
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
