import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./adminAuth";
import { getPolicy } from "./loanHelpers";
import { logEvent } from "./activity";

/** Public on purpose: the parent approval page shows the same text. */
export const get = query({
  args: {},
  handler: async (ctx) => getPolicy(ctx),
});

export const save = mutation({
  args: { text: v.string(), damageFee: v.number(), currency: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const text = args.text.trim();
    const currency = args.currency.trim().toUpperCase() || "GHS";
    if (text.length < 20) throw new ConvexError("The policy text is too short.");
    if (text.length > 4000) throw new ConvexError("The policy text is too long (4000 characters max).");
    if (!Number.isFinite(args.damageFee) || args.damageFee < 0 || args.damageFee > 100000) {
      throw new ConvexError("Enter a damage fee between 0 and 100000.");
    }
    const current = await getPolicy(ctx);
    const unchanged = current.text === text && current.damageFee === args.damageFee && current.currency === currency;
    if (unchanged) return { version: current.version };
    const row = await ctx.db.query("loanPolicy").first();
    const doc = { text, damageFee: args.damageFee, currency, version: current.version + 1, updatedAt: new Date().toISOString() };
    if (row) await ctx.db.replace(row._id, doc);
    else await ctx.db.insert("loanPolicy", doc);
    await logEvent(ctx, "policy.updated", `Updated the borrowing policy (version ${doc.version}), damage fee ${currency} ${args.damageFee}`, { entity: "policy" });
    return { version: doc.version };
  },
});

/** Per-book replacement cost. Leave price empty to fall back to the default damage fee. */
export const setBookPrice = mutation({
  args: { bookId: v.id("books"), price: v.optional(v.number()) },
  handler: async (ctx, { bookId, price }) => {
    await requireAdmin(ctx);
    if (price !== undefined && (!Number.isFinite(price) || price < 0 || price > 100000)) {
      throw new ConvexError("Enter a price between 0 and 100000.");
    }
    await ctx.db.patch(bookId, { price });
    const priced = await ctx.db.get(bookId);
    await logEvent(ctx, "policy.book_price", `Set the replacement price of "${priced?.title ?? "a book"}" to ${price ?? "the default"}`, { entity: "book", entityId: bookId });
  },
});
