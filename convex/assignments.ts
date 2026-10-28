import { mutation, query } from "./secure";
import { v, ConvexError } from "convex/values";
import { MIN_BORROW_AGE, ageOn } from "./policy";
import { newToken } from "./loanHelpers";
import { logEvent, loanLabel } from "./activity";

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
    await logEvent(ctx, "loan.assign", `Assigned "${book.title}" to ${kid.name}, waiting for the parent`, { entity: "loan", entityId: id });
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
    await logEvent(ctx, "loan.return", `Marked returned: ${await loanLabel(ctx, id)}`, { entity: "loan", entityId: id });
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
    const bits: string[] = [];
    if (updates.currentPage !== undefined) bits.push(`now on page ${updates.currentPage}`);
    if (updates.completed !== undefined) bits.push(updates.completed ? "finished reading" : "reopened");
    if (updates.returnedAt !== undefined) bits.push("returned");
    if (bits.length) await logEvent(ctx, updates.returnedAt !== undefined ? "loan.return" : "loan.progress", `${await loanLabel(ctx, id)}: ${bits.join(", ")}`, { entity: "loan", entityId: id });
  },
});
