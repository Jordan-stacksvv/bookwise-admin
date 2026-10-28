import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAdmin, requireAdmin, requireSignedIn } from "./adminAuth";
import { logEvent, memberLabel } from "./activity";

const HOUR = 3600 * 1000;
const clean = (s?: string, max = 120) => {
  const t = s?.trim();
  return t ? t.slice(0, max) : undefined;
};
const envIds = () =>
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

async function teacherByEmail(ctx: MutationCtx, email: string) {
  const all = await ctx.db.query("teachers").collect();
  return all.find((t) => t.email?.trim().toLowerCase() === email.toLowerCase()) ?? null;
}

/**
 * Records every signed-in person once (name, email, photo, the role they picked on the login page).
 * NEW people are "pending" until an admin approves them - except:
 *  - admins (always approved)
 *  - people whose VERIFIED sign-in email (from the Clerk token, not from the browser) matches a teacher
 *    the admin already added on the Teachers page: they are approved and linked automatically.
 */
export const sync = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.optional(v.union(v.literal("teacher"), v.literal("admin"))),
  },
  handler: async (ctx, args) => {
    const who = await requireSignedIn(ctx);
    const row = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", who.userId!)).first();
    const now = new Date().toISOString();
    const image = args.imageUrl && /^https:\/\//.test(args.imageUrl) ? args.imageUrl.slice(0, 500) : undefined;
    const next = {
      name: clean(args.name) ?? who.name ?? undefined,
      email: clean(args.email) ?? who.email ?? undefined, // shown to admins; typed by the browser, so NOT trusted
      imageUrl: image,
      role: args.role ?? row?.role,
    };

    // Auto-approval only ever uses the email from the signed token.
    const preAdded = !who.isAdmin && who.email ? await teacherByEmail(ctx, who.email) : null;
    const taken = preAdded ? await ctx.db.query("members").collect().then((ms) => ms.some((m) => m.teacherId === preAdded._id && m.userId !== who.userId)) : false;
    const auto = who.isAdmin || (preAdded && !taken);
    const approval = auto
      ? { status: "approved" as const, approvedAt: now, approvedBy: who.isAdmin ? "Admin" : "Teacher list", teacherId: preAdded && !taken ? preAdded._id : undefined }
      : null;

    if (!row) {
      await ctx.db.insert("members", {
        userId: who.userId!,
        ...next,
        status: approval ? "approved" : "pending",
        ...(approval ? { approvedAt: approval.approvedAt, approvedBy: approval.approvedBy, teacherId: approval.teacherId } : {}),
        createdAt: now,
        lastSeenAt: now,
      });
      await logEvent(ctx, "member.signup", `${next.name ?? next.email ?? "Someone"} signed in for the first time (${approval ? "approved automatically" : "waiting for approval"})`, { entity: "member", entityId: who.userId! });
      return;
    }

    const patch: Record<string, unknown> = {};
    const changed = row.name !== next.name || row.email !== next.email || row.imageUrl !== next.imageUrl || row.role !== next.role;
    if (changed) Object.assign(patch, next);
    if (Date.now() - Date.parse(row.lastSeenAt) > HOUR || changed) patch.lastSeenAt = now;
    // Waiting (or legacy, no status) and now recognised: approve. A person an admin DENIED stays denied.
    if (approval && row.status !== "approved" && row.status !== "denied") {
      Object.assign(patch, { status: "approved", approvedAt: approval.approvedAt, approvedBy: approval.approvedBy, teacherId: approval.teacherId ?? row.teacherId });
      await logEvent(ctx, "member.auto_approved", `${next.name ?? next.email ?? "Someone"} was approved automatically`, { entity: "member", entityId: who.userId! });
    }
    if (Object.keys(patch).length) await ctx.db.patch(row._id, patch);
  },
});

/** Admins only: everyone who has signed in, with their status. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const who = await getAdmin(ctx);
    if (!who.isAdmin) return [];
    const [members, adminRows, teachers] = await Promise.all([
      ctx.db.query("members").collect(),
      ctx.db.query("admins").collect(),
      ctx.db.query("teachers").collect(),
    ]);
    const inTable = new Set(adminRows.map((r) => r.userId));
    const env = new Set(envIds());
    return members
      .map((m) => {
        const fromServer = env.has(m.userId.toLowerCase());
        const isAdmin = fromServer || inTable.has(m.userId);
        const email = m.email?.trim().toLowerCase();
        const suggested = email ? teachers.find((t) => t.email?.trim().toLowerCase() === email) : undefined;
        const teacher = m.teacherId ? teachers.find((t) => t._id === m.teacherId) : undefined;
        return {
          ...m,
          access: isAdmin ? ("admin" as const) : ((m.status ?? "pending") as "pending" | "approved" | "denied"),
          isAdmin,
          fromServerSetting: fromServer,
          isYou: m.userId === who.userId,
          teacherName: teacher?.name ?? null,
          suggestedTeacherId: suggested?._id ?? null,
          suggestedTeacherName: suggested?.name ?? null,
        };
      })
      .sort((a, b) => {
        const rank = (x: { access: string }) => (x.access === "pending" ? 0 : x.access === "admin" ? 1 : x.access === "approved" ? 2 : 3);
        return rank(a) - rank(b) || b.lastSeenAt.localeCompare(a.lastSeenAt);
      });
  },
});

/** Approve someone as a teacher (linking or creating their record on the Teachers page) or as an admin. */
export const approve = mutation({
  args: {
    userId: v.string(),
    as: v.union(v.literal("teacher"), v.literal("admin")),
    teacherId: v.optional(v.id("teachers")),
    create: v.optional(
      v.object({
        name: v.string(),
        department: v.string(),
        className: v.optional(v.string()),
        phone: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { userId, as, teacherId, create }) => {
    const who = await requireAdmin(ctx);
    const m = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!m) throw new ConvexError("That person has not signed in yet.");
    const by = who.name ?? who.email ?? "Admin";
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: "approved", approvedAt: now, approvedBy: by };

    if (as === "admin") {
      const existing = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).first();
      if (!existing) await ctx.db.insert("admins", { userId, name: m.name, email: m.email, addedBy: by, createdAt: now });
      const reqs = await ctx.db.query("adminRequests").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
      for (const r of reqs) await ctx.db.delete(r._id);
    } else {
      let link = teacherId;
      if (link) {
        if (!(await ctx.db.get(link))) throw new ConvexError("That teacher no longer exists.");
        const members = await ctx.db.query("members").collect();
        if (members.some((x) => x.teacherId === link && x.userId !== userId)) throw new ConvexError("That teacher is already linked to another account.");
      } else if (create) {
        const name = create.name.trim();
        if (!name) throw new ConvexError("Enter the teacher's name.");
        if (name.length > 80) throw new ConvexError("That name is too long.");
        if (!create.department.trim()) throw new ConvexError("Choose a class.");
        link = await ctx.db.insert("teachers", {
          name,
          department: create.department.trim(),
          className: clean(create.className, 60),
          phone: clean(create.phone, 30),
          email: m.email,
        });
      }
      if (link) patch.teacherId = link;
    }
    await ctx.db.patch(m._id, patch);
    await logEvent(ctx, "member.approved", `Approved ${m.name ?? m.email ?? "someone"} as ${as}`, { entity: "member", entityId: userId });
  },
});

/** Say no, or take access away. Also removes admin rights given in the app. */
export const deny = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const who = await requireAdmin(ctx);
    if (userId === who.userId) throw new ConvexError("You cannot remove your own access.");
    if (envIds().includes(userId.toLowerCase())) throw new ConvexError("This admin is set in the server settings and cannot be removed here.");
    const m = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!m) throw new ConvexError("That person has not signed in yet.");
    const rows = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const r of rows) await ctx.db.delete(r._id);
    await ctx.db.patch(m._id, { status: "denied" });
    await logEvent(ctx, "member.denied", `Removed access for ${m.name ?? m.email ?? "someone"}`, { entity: "member", entityId: userId });
  },
});

export const makeAdmin = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const who = await requireAdmin(ctx);
    const m = await ctx.db.query("members").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!m) throw new ConvexError("That person has not signed in yet.");
    const existing = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (!existing) {
      await ctx.db.insert("admins", { userId, name: m.name, email: m.email, addedBy: who.name ?? who.email ?? "Admin", createdAt: new Date().toISOString() });
    }
    if (m.status !== "approved") await ctx.db.patch(m._id, { status: "approved", approvedAt: new Date().toISOString(), approvedBy: who.name ?? who.email ?? "Admin" });
    const reqs = await ctx.db.query("adminRequests").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const r of reqs) await ctx.db.delete(r._id);
    await logEvent(ctx, "admin.made", `Made ${m.name ?? m.email ?? "someone"} an admin`, { entity: "member", entityId: userId });
  },
});

/** Back to a normal teacher (keeps their access). */
export const removeAdmin = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const who = await requireAdmin(ctx);
    if (userId === who.userId) throw new ConvexError("You cannot remove yourself.");
    if (envIds().includes(userId.toLowerCase())) throw new ConvexError("This admin is set in the server settings and cannot be removed here.");
    const rows = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const r of rows) await ctx.db.delete(r._id);
    await logEvent(ctx, "admin.removed", `${await memberLabel(ctx, userId)} is no longer an admin`, { entity: "member", entityId: userId });
  },
});
