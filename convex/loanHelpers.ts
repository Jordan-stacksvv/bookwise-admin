import type { QueryCtx, MutationCtx } from "./_generated/server";
import { DEFAULT_CURRENCY, DEFAULT_DAMAGE_FEE, DEFAULT_POLICY_TEXT } from "./policy";

export async function getPolicy(ctx: QueryCtx | MutationCtx) {
  const row = await ctx.db.query("loanPolicy").first();
  if (!row) {
    return {
      text: DEFAULT_POLICY_TEXT,
      damageFee: DEFAULT_DAMAGE_FEE,
      currency: DEFAULT_CURRENCY,
      version: 1,
      updatedAt: undefined as string | undefined,
    };
  }
  return { text: row.text, damageFee: row.damageFee, currency: row.currency, version: row.version, updatedAt: row.updatedAt };
}

/** 64 hex chars from two random UUIDs - not guessable. */
export function newToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

/** Replacement cost: the book's own price if set, otherwise the default damage fee. */
export function feeFor(book: { price?: number } | null, policy: { damageFee: number }): number {
  return book?.price ?? policy.damageFee;
}
