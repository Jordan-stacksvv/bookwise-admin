import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAdmin, requireAdmin } from "./adminAuth";
import { requireApproved } from "./access";
import { feeFor, getPolicy } from "./loanHelpers";

const now = () => new Date().toISOString();

/**
 * PUBLIC (no login): what the parent sees on the approval link.
 * Returns only what the page needs - never other children, phone numbers or ids.
 */
export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length < 32) return null;
    const a = await ctx.db.query("assignments").withIndex("by_token", (q) => q.eq("approvalToken", token)).first();
    if (!a) return null;
    const [kid, book, policy] = await Promise.all([ctx.db.get(a.kidId), ctx.db.get(a.bookId), getPolicy(ctx)]);
    if (!kid || !book) return null;
    return {
      status: a.status ?? "approved",
      ended: !!a.returnedAt,
      kidName: kid.name,
      parentName: kid.parentName ?? null,
      bookTitle: book.title,
      author: book.author,
      dueDate: a.dueDate,
      parentApprovedAt: a.parentApprovedAt ?? null,
      policy: { text: policy.text, version: policy.version, currency: policy.currency, fee: feeFor(book, policy) },
    };
  },
});

/** PUBLIC (no login): the parent taps Approve. Records time, name and policy version. */
export const parentApprove = mutation({
  args: { token: v.string(), parentName: v.string(), policyVersion: v.number() },
  handler: async (ctx, { token, parentName, policyVersion }) => {
    if (token.length < 32) throw new ConvexError("This link is not valid.");
    const a = await ctx.db.query("assignments").withIndex("by_token", (q) => q.eq("approvalToken", token)).first();
    if (!a) throw new ConvexError("This link is not valid.");
    const status = a.status ?? "approved";
    if (status === "pending_admin" || status === "approved" || status === "lost") return { ok: true, already: true };
    if (status !== "pending_parent" || a.returnedAt) throw new ConvexError("This request is no longer active.");
    const name = parentName.trim();
    if (name.length < 2) throw new ConvexError("Please type your full name.");
    if (name.length > 80) throw new ConvexError("That name is too long.");
    const policy = await getPolicy(ctx);
    if (policy.version !== policyVersion) {
      throw new ConvexError("The policy was just updated. Please reload this page and read it again.");
    }
    await ctx.db.patch(a._id, {
      status: "pending_admin",
      parentApprovedAt: now(),
      parentApprovedName: name,
      policyVersion: policy.version,
    });
    return { ok: true, already: false };
  },
});

/** Teacher cancels a loan that is still waiting for the parent. */
export const cancel = mutation({
  args: { id: v.id("assignments") },
  handler: async (ctx, { id }) => {
    await requireApproved(ctx);
    const a = await ctx.db.get(id);
    if (!a) throw new ConvexError("Loan not found.");
    if (a.status !== "pending_parent") throw new ConvexError("Only loans waiting for the parent can be cancelled.");
    await ctx.db.patch(id, { status: "cancelled", returnedAt: now() });
  },
});

/** Admin final approval: the book can be handed over. */
export const adminApprove = mutation({
  args: { id: v.id("assignments") },
  handler: async (ctx, { id }) => {
    const who = await requireAdmin(ctx);
    const a = await ctx.db.get(id);
    if (!a) throw new ConvexError("Loan not found.");
    if (a.returnedAt) throw new ConvexError("This loan has already ended.");
    if (a.status !== "pending_admin") throw new ConvexError("The parent has not approved this loan yet.");
    await ctx.db.patch(id, { status: "approved", adminApprovedAt: now(), adminApprovedBy: who.name ?? who.email ?? "Admin" });
  },
});

/** Admin declines a loan (before hand-over). The copy goes back on the shelf. */
export const adminReject = mutation({
  args: { id: v.id("assignments"), reason: v.optional(v.string()) },
  handler: async (ctx, { id, reason }) => {
    await requireAdmin(ctx);
    const a = await ctx.db.get(id);
    if (!a) throw new ConvexError("Loan not found.");
    if (a.status !== "pending_parent" && a.status !== "pending_admin") {
      throw new ConvexError("Only loans that are still waiting can be declined.");
    }
    await ctx.db.patch(id, { status: "rejected", rejectedReason: reason?.trim() || undefined, returnedAt: now() });
  },
});

/**
 * Admin charges a fee on a loan.
 *  - kind "lost": the loan is closed and one copy is removed from the shelf count.
 *  - kind "damaged": the loan is left as it is (use it for returned or on-loan books).
 */
export const chargeFee = mutation({
  args: {
    id: v.id("assignments"),
    kind: v.union(v.literal("lost"), v.literal("damaged")),
    amount: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { id, kind, amount, note }) => {
    await requireAdmin(ctx);
    const a = await ctx.db.get(id);
    if (!a) throw new ConvexError("Loan not found.");
    if (a.feeStatus === "owed" || a.feeStatus === "paid") throw new ConvexError("A fee has already been recorded for this loan.");
    const book = await ctx.db.get(a.bookId);
    const policy = await getPolicy(ctx);
    const fee = amount ?? feeFor(book, policy);
    if (!Number.isFinite(fee) || fee < 0 || fee > 100000) throw new ConvexError("Enter a fee between 0 and 100000.");
    const patch: Record<string, unknown> = {
      feeKind: kind,
      feeAmount: fee,
      feeStatus: "owed",
      feeNote: note?.trim() || undefined,
      feeAt: now(),
    };
    if (kind === "lost") {
      if (a.status !== "approved" && a.status !== undefined) throw new ConvexError("Only a book that is out on loan can be marked lost.");
      if (a.returnedAt) throw new ConvexError("This book was already returned.");
      patch.status = "lost";
      patch.returnedAt = now();
      if (book) await ctx.db.patch(book._id, { copies: Math.max(0, book.copies - 1) });
    }
    await ctx.db.patch(id, patch);
  },
});

export const setFeeStatus = mutation({
  args: { id: v.id("assignments"), feeStatus: v.union(v.literal("owed"), v.literal("paid"), v.literal("waived")) },
  handler: async (ctx, { id, feeStatus }) => {
    await requireAdmin(ctx);
    const a = await ctx.db.get(id);
    if (!a || a.feeStatus === undefined) throw new ConvexError("No fee recorded for this loan.");
    await ctx.db.patch(id, { feeStatus });
  },
});
