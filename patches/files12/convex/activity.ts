import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAdmin } from "./adminAuth";

export type ActorRole = "admin" | "teacher" | "pending" | "parent" | "system";

type Extra = {
  entity?: string;
  entityId?: string;
  /** Use for people who are not signed in (the parent approving by link). Otherwise the signed-in caller is used. */
  actor?: { role: ActorRole; name: string };
};

/**
 * Writes one line to the activity log. Call it inside a mutation, after the change has been made.
 * The caller (name + role) is worked out on the server from the sign-in token, never taken from the browser.
 * A logging problem never blocks the action itself.
 */
export async function logEvent(ctx: MutationCtx, action: string, summary: string, extra: Extra = {}) {
  try {
    let actor = extra.actor ?? null;
    let actorId: string | undefined;
    if (!actor) {
      const who = await getAdmin(ctx);
      if (who.signedIn) {
        actorId = who.userId ?? undefined;
        const m = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", who.userId!)).first();
        actor = {
          role: who.isAdmin ? "admin" : m?.status === "approved" ? "teacher" : "pending",
          name: m?.name ?? who.name ?? who.email ?? "Unknown",
        };
      } else {
        actor = { role: "system", name: "System" };
      }
    }
    await ctx.db.insert("activityLog", {
      at: new Date().toISOString(),
      actorId,
      actorRole: actor.role,
      actorName: actor.name.slice(0, 120),
      action,
      summary: summary.slice(0, 300),
      entity: extra.entity,
      entityId: extra.entityId,
    });
  } catch (e) {
    console.error("activity log failed", e);
  }
}

/** `"Book title" for Child Name` */
export async function loanLabel(ctx: MutationCtx, id: Id<"assignments">) {
  const a = await ctx.db.get(id);
  if (!a) return "a loan";
  const [kid, book] = await Promise.all([ctx.db.get(a.kidId), ctx.db.get(a.bookId)]);
  return `"${book?.title ?? "a book"}" for ${kid?.name ?? "a child"}`;
}

/** `Child Name on "Book title"` */
export async function kidBookLabel(ctx: MutationCtx, kidId: Id<"kids">, bookId: Id<"books">) {
  const [kid, book] = await Promise.all([ctx.db.get(kidId), ctx.db.get(bookId)]);
  return `${kid?.name ?? "a child"} on "${book?.title ?? "a book"}"`;
}

export async function memberLabel(ctx: MutationCtx, userId: string) {
  const m = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", userId)).first();
  return m?.name ?? m?.email ?? "someone";
}

const SCAN_CAP = 10000;

/**
 * Admins only. Newest first. Filters: who (role), area (action prefix such as "loan."), words, and a date range
 * (ISO strings). `limit` is capped at 5000 (the Export button asks for the maximum).
 */
export const list = query({
  args: {
    role: v.optional(v.string()),
    action: v.optional(v.string()),
    search: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, a) => {
    const who = await getAdmin(ctx);
    if (!who.isAdmin) return { rows: [], hasMore: false };
    const limit = Math.min(Math.max(Math.floor(a.limit ?? 200), 1), 5000);
    const words = a.search?.trim().toLowerCase();
    const rows = [];
    let scanned = 0;
    let hasMore = false;
    for await (const r of ctx.db.query("activityLog").withIndex("by_at").order("desc")) {
      if (++scanned > SCAN_CAP) {
        hasMore = true;
        break;
      }
      if (a.to && r.at > a.to) continue;
      if (a.from && r.at < a.from) break; // newest first, so everything after this is older
      if (a.role && r.actorRole !== a.role) continue;
      if (a.action && !r.action.startsWith(a.action)) continue;
      if (words && !`${r.actorName} ${r.summary}`.toLowerCase().includes(words)) continue;
      if (rows.length >= limit) {
        hasMore = true;
        break;
      }
      rows.push(r);
    }
    return { rows, hasMore };
  },
});
