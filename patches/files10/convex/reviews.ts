import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./adminAuth";
import { isApproved, requireApproved } from "./access";
import { newToken } from "./loanHelpers";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** "Ama Kofi Mensah" -> "Ama M."  (what the public sees: first name + last initial) */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "A reader";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isApproved(ctx))) return [];
    const rows = await ctx.db.query("bookReviews").collect();
    return Promise.all(rows.map(async (r) => ({ ...r, imageUrl: r.imageId ? await ctx.storage.getUrl(r.imageId) : null })));
  },
});

export const listByKid = query({
  args: { kidId: v.id("kids") },
  handler: async (ctx, { kidId }) => {
    if (!(await isApproved(ctx))) return [];
    return ctx.db.query("bookReviews").withIndex("by_kid", (q) => q.eq("kidId", kidId)).collect();
  },
});

/** Step 1 of attaching a photo of a handwritten review. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireApproved(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

/** A teacher adds a review for a kid. It goes to the admin for approval before anyone else can see it. */
export const add = mutation({
  args: {
    assignmentId: v.id("assignments"),
    kidId: v.id("kids"),
    bookId: v.id("books"),
    chapterRange: v.optional(v.string()),
    summary: v.string(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireApproved(ctx);
    const summary = args.summary.trim();
    if (!summary) throw new ConvexError("Write the review first.");
    if (summary.length > 3000) throw new ConvexError("The review is too long (3000 characters max).");
    const chapterRange = args.chapterRange?.trim().slice(0, 40) || undefined;
    if (args.imageId) {
      const meta = await ctx.db.system.get(args.imageId);
      if (!meta || !meta.contentType?.startsWith("image/") || meta.size > MAX_IMAGE_BYTES) {
        throw new ConvexError("The photo must be an image under 6 MB.");
      }
    }
    const now = new Date().toISOString();
    return ctx.db.insert("bookReviews", {
      assignmentId: args.assignmentId,
      kidId: args.kidId,
      bookId: args.bookId,
      chapterRange,
      summary,
      imageId: args.imageId,
      createdAt: now,
      status: "pending",
      submittedAt: now,
    });
  },
});

/** Reviews saved before approvals existed (no status), or ones the admin declined, can be (re)submitted. */
export const submit = mutation({
  args: { id: v.id("bookReviews") },
  handler: async (ctx, { id }) => {
    await requireApproved(ctx);
    const r = await ctx.db.get(id);
    if (!r) throw new ConvexError("Review not found.");
    if (r.status !== undefined && r.status !== "rejected") throw new ConvexError("This review has already been submitted.");
    await ctx.db.patch(id, { status: "pending", submittedAt: new Date().toISOString(), rejectedReason: undefined });
  },
});

export const markSent = mutation({
  args: { id: v.id("bookReviews") },
  handler: async (ctx, { id }) => {
    await requireApproved(ctx);
    await ctx.db.patch(id, { sentToParentAt: new Date().toISOString() });
  },
});

export const remove = mutation({
  args: { id: v.id("bookReviews") },
  handler: async (ctx, { id }) => {
    await requireApproved(ctx);
    const r = await ctx.db.get(id);
    if (!r) return;
    if (r.imageId) await ctx.storage.delete(r.imageId);
    await ctx.db.delete(id);
  },
});

/** Admin: publish a review. It gets a public share link. */
export const approve = mutation({
  args: { id: v.id("bookReviews") },
  handler: async (ctx, { id }) => {
    const who = await requireAdmin(ctx);
    const r = await ctx.db.get(id);
    if (!r) throw new ConvexError("Review not found.");
    if (r.status !== "pending" && r.status !== "rejected") throw new ConvexError("This review is not waiting for approval.");
    await ctx.db.patch(id, {
      status: "approved",
      shareToken: r.shareToken ?? newToken().slice(0, 32),
      decidedAt: new Date().toISOString(),
      decidedBy: who.name ?? who.email ?? "Admin",
      rejectedReason: undefined,
    });
  },
});

/** Admin: decline a waiting review, or take a published one down (its link stops working). */
export const reject = mutation({
  args: { id: v.id("bookReviews"), reason: v.optional(v.string()) },
  handler: async (ctx, { id, reason }) => {
    const who = await requireAdmin(ctx);
    const r = await ctx.db.get(id);
    if (!r) throw new ConvexError("Review not found.");
    if (r.status !== "pending" && r.status !== "approved") throw new ConvexError("Nothing to decline here.");
    await ctx.db.patch(id, {
      status: "rejected",
      rejectedReason: reason?.trim().slice(0, 200) || undefined,
      decidedAt: new Date().toISOString(),
      decidedBy: who.name ?? who.email ?? "Admin",
    });
  },
});

/** PUBLIC (no login): the share page. Only approved reviews, and only first name + last initial. */
export const publicByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length < 20) return null;
    const r = await ctx.db.query("bookReviews").withIndex("by_token", (q) => q.eq("shareToken", token)).first();
    if (!r || r.status !== "approved") return null;
    const [kid, book] = await Promise.all([ctx.db.get(r.kidId), ctx.db.get(r.bookId)]);
    if (!kid || !book) return null;
    return {
      bookTitle: book.title,
      author: book.author,
      reader: shortName(kid.name),
      className: kid.department,
      chapterRange: r.chapterRange ?? null,
      summary: r.summary,
      imageUrl: r.imageId ? await ctx.storage.getUrl(r.imageId) : null,
      publishedAt: r.decidedAt ?? r.createdAt,
    };
  },
});
