"use strict";
/**
 * 12 - Activity log + exports
 * - Every important action (teacher, parent, admin) is written to a log table by the server, with who and when.
 * - Admin > Activity: filter by person type, area, dates and words.
 * - CSV exports (open in Excel): activity log, loans, reviews, fees, people, books.
 * Run from the project root, then:  npx convex dev --once
 */
const { load, has, replaceOnce, run } = require("./_lib.cjs");
const { createFrom, L } = require("./_files.cjs");

const DIR = "files12";
const DRY = process.argv.includes("--dry");


run("12 activity log", () => {
  const schema = load("convex/schema.ts");
  if (has(schema, "activityLog")) return "skip";
  if (!DRY && !has(schema, "approvedBy")) throw new Error("Apply patch 11 first.");

  // ---- new files
  createFrom(DIR, "convex/activity.ts");
  createFrom(DIR, "src/lib/csv.ts");
  createFrom(DIR, "src/components/admin-app/ExportPanel.tsx");
  createFrom(DIR, "src/routes/admin/activity.tsx");

  // ---- schema
  replaceOnce(
    schema,
    L("    note: v.optional(v.string()),", "    createdAt: v.string(),", "    createdBy: v.string(),", "  }),", "});"),
    L(
      "    note: v.optional(v.string()),",
      "    createdAt: v.string(),",
      "    createdBy: v.string(),",
      "  }),",
      "",
      "  // What happened, who did it and when. Written by the server only; admins read it (Admin > Activity).",
      "  activityLog: defineTable({",
      "    at: v.string(),",
      "    actorId: v.optional(v.string()),",
      "    actorRole: v.string(), // admin | teacher | parent | pending | system",
      "    actorName: v.string(),",
      "    action: v.string(), // area.what, e.g. loan.assign",
      "    summary: v.string(),",
      "    entity: v.optional(v.string()),",
      "    entityId: v.optional(v.string()),",
      '  }).index("by_at", ["at"]),',
      "});",
    ),
    "activityLog table",
  );

  // ---- api.d.ts (npx convex dev regenerates it; this keeps the types right until then)
  const api = load("convex/_generated/api.d.ts");
  if (!has(api, "as activity from")) {
    replaceOnce(api, 'import type * as access from "../access.js";', L('import type * as access from "../access.js";', 'import type * as activity from "../activity.js";'), "api import");
    replaceOnce(api, "  access: typeof access;", L("  access: typeof access;", "  activity: typeof activity;"), "api module");
  }

  // ---- small helper so each edit reads clearly
  const imp = (f, after) => replaceOnce(f, after, L(after, 'import { logEvent } from "./activity";'), `${f.rel} import`);

  // ---- books
  const books = load("convex/books.ts");
  imp(books, 'import { v, ConvexError } from "convex/values";');
  replaceOnce(
    books,
    '    return await ctx.db.insert("books", code ? { ...rest, code } : rest);',
    L(
      '    const id = await ctx.db.insert("books", code ? { ...rest, code } : rest);',
      '    await logEvent(ctx, "book.add", `Added book "${args.title}"${code ? ` (${code})` : ""}`, { entity: "book", entityId: id });',
      "    return id;",
    ),
    "book add",
  );
  replaceOnce(
    books,
    L("      updates.code = code || undefined; // empty string clears the code", "    }", "    await ctx.db.patch(id, updates);"),
    L(
      "      updates.code = code || undefined; // empty string clears the code",
      "    }",
      "    await ctx.db.patch(id, updates);",
      "    const edited = await ctx.db.get(id);",
      '    await logEvent(ctx, "book.edit", `Edited book "${edited?.title ?? "unknown"}"`, { entity: "book", entityId: id });',
    ),
    "book edit",
  );
  replaceOnce(books, "    // Remove issues", L("    const gone = await ctx.db.get(id);", "    // Remove issues"), "book remove start");
  replaceOnce(
    books,
    L("    await ctx.db.delete(id);", "  },", "});", "", "export const addIssue"),
    L(
      "    await ctx.db.delete(id);",
      '    await logEvent(ctx, "book.remove", `Removed book "${gone?.title ?? "unknown"}" and its loans`, { entity: "book", entityId: id });',
      "  },",
      "});",
      "",
      "export const addIssue",
    ),
    "book remove end",
  );
  replaceOnce(
    books,
    '    await ctx.db.insert("bookIssues", { bookId, note: note.trim(), reportedAt: new Date().toISOString() });',
    L(
      '    await ctx.db.insert("bookIssues", { bookId, note: note.trim(), reportedAt: new Date().toISOString() });',
      "    const issueBook = await ctx.db.get(bookId);",
      '    await logEvent(ctx, "book.issue", `Reported a problem with "${issueBook?.title ?? "a book"}": ${note.trim().slice(0, 120)}`, { entity: "book", entityId: bookId });',
    ),
    "book issue",
  );
  replaceOnce(
    books,
    "    await ctx.db.delete(issueId);",
    L("    await ctx.db.delete(issueId);", '    await logEvent(ctx, "book.issue_removed", "Cleared a reported book problem", { entity: "book" });'),
    "book issue removed",
  );

  // ---- kids
  const kids = load("convex/kids.ts");
  imp(kids, 'import { v } from "convex/values";');
  replaceOnce(
    kids,
    '  handler: async (ctx, args) => ctx.db.insert("kids", args),',
    L(
      "  handler: async (ctx, args) => {",
      '    const id = await ctx.db.insert("kids", args);',
      '    await logEvent(ctx, "kid.add", `Added kid ${args.name} (${args.department})`, { entity: "kid", entityId: id });',
      "    return id;",
      "  },",
    ),
    "kid add",
  );
  replaceOnce(
    kids,
    "  handler: async (ctx, { id, ...updates }) => ctx.db.patch(id, updates),",
    L(
      "  handler: async (ctx, { id, ...updates }) => {",
      "    await ctx.db.patch(id, updates);",
      "    const k = await ctx.db.get(id);",
      '    await logEvent(ctx, "kid.edit", `Edited kid ${k?.name ?? "unknown"}`, { entity: "kid", entityId: id });',
      "  },",
    ),
    "kid edit",
  );
  replaceOnce(
    kids,
    '    const assignments = await ctx.db.query("assignments").withIndex("by_kid", (q) => q.eq("kidId", id)).collect();',
    L("    const gone = await ctx.db.get(id);", '    const assignments = await ctx.db.query("assignments").withIndex("by_kid", (q) => q.eq("kidId", id)).collect();'),
    "kid remove start",
  );
  replaceOnce(
    kids,
    "    await ctx.db.delete(id);\n",
    L("    await ctx.db.delete(id);", '    await logEvent(ctx, "kid.remove", `Removed kid ${gone?.name ?? "unknown"} and their loans`, { entity: "kid", entityId: id });', ""),
    "kid remove end",
  );

  // ---- teachers
  const teachers = load("convex/teachers.ts");
  imp(teachers, 'import { v } from "convex/values";');
  replaceOnce(
    teachers,
    '  handler: async (ctx, args) => ctx.db.insert("teachers", args),',
    L(
      "  handler: async (ctx, args) => {",
      '    const id = await ctx.db.insert("teachers", args);',
      '    await logEvent(ctx, "teacher.add", `Added teacher ${args.name} (${args.department})`, { entity: "teacher", entityId: id });',
      "    return id;",
      "  },",
    ),
    "teacher add",
  );
  replaceOnce(
    teachers,
    "  handler: async (ctx, { id, ...updates }) => ctx.db.patch(id, updates),",
    L(
      "  handler: async (ctx, { id, ...updates }) => {",
      "    await ctx.db.patch(id, updates);",
      "    const t = await ctx.db.get(id);",
      '    await logEvent(ctx, "teacher.edit", `Edited teacher ${t?.name ?? "unknown"}`, { entity: "teacher", entityId: id });',
      "  },",
    ),
    "teacher edit",
  );
  replaceOnce(
    teachers,
    "  handler: async (ctx, { id }) => ctx.db.delete(id),",
    L(
      "  handler: async (ctx, { id }) => {",
      "    const t = await ctx.db.get(id);",
      "    await ctx.db.delete(id);",
      '    await logEvent(ctx, "teacher.remove", `Removed teacher ${t?.name ?? "unknown"}`, { entity: "teacher", entityId: id });',
      "  },",
    ),
    "teacher remove",
  );

  // ---- assignments (teacher side)
  const asg = load("convex/assignments.ts");
  imp(asg, 'import { newToken } from "./loanHelpers";');
  replaceOnce(asg, 'import { logEvent } from "./activity";', 'import { logEvent, loanLabel } from "./activity";', "assignments import label");
  replaceOnce(
    asg,
    L("      approvalToken: token,", "    });", "    return {"),
    L(
      "      approvalToken: token,",
      "    });",
      '    await logEvent(ctx, "loan.assign", `Assigned "${book.title}" to ${kid.name}, waiting for the parent`, { entity: "loan", entityId: id });',
      "    return {",
    ),
    "assign",
  );
  replaceOnce(
    asg,
    '    await ctx.db.patch(id, { returnedAt: new Date().toISOString() });',
    L(
      '    await ctx.db.patch(id, { returnedAt: new Date().toISOString() });',
      '    await logEvent(ctx, "loan.return", `Marked returned: ${await loanLabel(ctx, id)}`, { entity: "loan", entityId: id });',
    ),
    "return",
  );
  replaceOnce(
    asg,
    L("  handler: async (ctx, { id, ...updates }) => {", "    await ctx.db.patch(id, updates);", "  },"),
    L(
      "  handler: async (ctx, { id, ...updates }) => {",
      "    await ctx.db.patch(id, updates);",
      "    const bits: string[] = [];",
      '    if (updates.currentPage !== undefined) bits.push(`now on page ${updates.currentPage}`);',
      '    if (updates.completed !== undefined) bits.push(updates.completed ? "finished reading" : "reopened");',
      '    if (updates.returnedAt !== undefined) bits.push("returned");',
      '    if (bits.length) await logEvent(ctx, updates.returnedAt !== undefined ? "loan.return" : "loan.progress", `${await loanLabel(ctx, id)}: ${bits.join(", ")}`, { entity: "loan", entityId: id });',
      "  },",
    ),
    "update",
  );

  // ---- loans (parent + admin)
  const loans = load("convex/loans.ts");
  imp(loans, 'import { feeFor, getPolicy } from "./loanHelpers";');
  replaceOnce(loans, 'import { logEvent } from "./activity";', 'import { logEvent, loanLabel } from "./activity";', "loans import label");
  replaceOnce(
    loans,
    L("      policyVersion: policy.version,", "    });", "    return { ok: true, already: false };"),
    L(
      "      policyVersion: policy.version,",
      "    });",
      '    await logEvent(ctx, "loan.parent_approved", `${name} (parent) approved ${await loanLabel(ctx, a._id)}`, { entity: "loan", entityId: a._id, actor: { role: "parent", name } });',
      "    return { ok: true, already: false };",
    ),
    "parent approve",
  );
  replaceOnce(
    loans,
    '    await ctx.db.patch(id, { status: "cancelled", returnedAt: now() });',
    L('    await ctx.db.patch(id, { status: "cancelled", returnedAt: now() });', '    await logEvent(ctx, "loan.cancelled", `Cancelled before the parent replied: ${await loanLabel(ctx, id)}`, { entity: "loan", entityId: id });'),
    "cancel",
  );
  replaceOnce(
    loans,
    '    await ctx.db.patch(id, { status: "approved", adminApprovedAt: now(), adminApprovedBy: who.name ?? who.email ?? "Admin" });',
    L(
      '    await ctx.db.patch(id, { status: "approved", adminApprovedAt: now(), adminApprovedBy: who.name ?? who.email ?? "Admin" });',
      '    await logEvent(ctx, "loan.admin_approved", `Final approval: ${await loanLabel(ctx, id)}`, { entity: "loan", entityId: id });',
    ),
    "admin approve",
  );
  replaceOnce(
    loans,
    '    await ctx.db.patch(id, { status: "rejected", rejectedReason: reason?.trim() || undefined, returnedAt: now() });',
    L(
      '    await ctx.db.patch(id, { status: "rejected", rejectedReason: reason?.trim() || undefined, returnedAt: now() });',
      '    await logEvent(ctx, "loan.rejected", `Declined ${await loanLabel(ctx, id)}${reason?.trim() ? `: ${reason.trim().slice(0, 120)}` : ""}`, { entity: "loan", entityId: id });',
    ),
    "admin reject",
  );
  replaceOnce(
    loans,
    L("    await ctx.db.patch(id, patch);", "  },", "});", "", "export const setFeeStatus"),
    L(
      "    await ctx.db.patch(id, patch);",
      '    await logEvent(ctx, "policy.fee_charged", `Charged ${kind} fee of ${policy.currency} ${fee}: ${await loanLabel(ctx, id)}`, { entity: "loan", entityId: id });',
      "  },",
      "});",
      "",
      "export const setFeeStatus",
    ),
    "charge fee",
  );
  replaceOnce(
    loans,
    "    await ctx.db.patch(id, { feeStatus });",
    L("    await ctx.db.patch(id, { feeStatus });", '    await logEvent(ctx, "policy.fee_status", `Fee marked ${feeStatus}: ${await loanLabel(ctx, id)}`, { entity: "loan", entityId: id });'),
    "fee status",
  );

  // ---- reviews
  const rv = load("convex/reviews.ts");
  imp(rv, 'import { newToken } from "./loanHelpers";');
  replaceOnce(rv, 'import { logEvent } from "./activity";', 'import { logEvent, kidBookLabel } from "./activity";', "reviews import label");
  replaceOnce(rv, '    return ctx.db.insert("bookReviews", {', '    const reviewId = await ctx.db.insert("bookReviews", {', "review add open");
  replaceOnce(
    rv,
    L('      status: "pending",', "      submittedAt: now,", "    });", "  },", "});"),
    L(
      '      status: "pending",',
      "      submittedAt: now,",
      "    });",
      '    await logEvent(ctx, "review.add", `Review added for ${await kidBookLabel(ctx, args.kidId, args.bookId)}${args.imageId ? " (with photo)" : ""}, sent to the admin`, { entity: "review", entityId: reviewId });',
      "    return reviewId;",
      "  },",
      "});",
    ),
    "review add close",
  );
  replaceOnce(
    rv,
    '    await ctx.db.patch(id, { status: "pending", submittedAt: new Date().toISOString(), rejectedReason: undefined });',
    L(
      '    await ctx.db.patch(id, { status: "pending", submittedAt: new Date().toISOString(), rejectedReason: undefined });',
      '    await logEvent(ctx, "review.submit", `Review submitted to the admin: ${await kidBookLabel(ctx, r.kidId, r.bookId)}`, { entity: "review", entityId: id });',
    ),
    "review submit",
  );
  replaceOnce(
    rv,
    L("    await requireApproved(ctx);", "    await ctx.db.patch(id, { sentToParentAt: new Date().toISOString() });"),
    L(
      "    await requireApproved(ctx);",
      "    await ctx.db.patch(id, { sentToParentAt: new Date().toISOString() });",
      "    const sent = await ctx.db.get(id);",
      '    if (sent) await logEvent(ctx, "review.sent", `Review sent to the parent: ${await kidBookLabel(ctx, sent.kidId, sent.bookId)}`, { entity: "review", entityId: id });',
    ),
    "review sent",
  );
  replaceOnce(
    rv,
    L("    if (r.imageId) await ctx.storage.delete(r.imageId);", "    await ctx.db.delete(id);"),
    L(
      "    if (r.imageId) await ctx.storage.delete(r.imageId);",
      "    await ctx.db.delete(id);",
      '    await logEvent(ctx, "review.remove", `Review deleted: ${await kidBookLabel(ctx, r.kidId, r.bookId)}`, { entity: "review", entityId: id });',
    ),
    "review remove",
  );
  replaceOnce(
    rv,
    L('      decidedBy: who.name ?? who.email ?? "Admin",', "      rejectedReason: undefined,", "    });"),
    L(
      '      decidedBy: who.name ?? who.email ?? "Admin",',
      "      rejectedReason: undefined,",
      "    });",
      '    await logEvent(ctx, "review.approved", `Review published: ${await kidBookLabel(ctx, r.kidId, r.bookId)}`, { entity: "review", entityId: id });',
    ),
    "review approve",
  );
  replaceOnce(
    rv,
    L('      decidedBy: who.name ?? who.email ?? "Admin",', "    });", "  },", "});", "", "/** PUBLIC"),
    L(
      '      decidedBy: who.name ?? who.email ?? "Admin",',
      "    });",
      '    await logEvent(ctx, r.status === "approved" ? "review.taken_down" : "review.declined", `${r.status === "approved" ? "Review taken down" : "Review declined"}: ${await kidBookLabel(ctx, r.kidId, r.bookId)}${reason?.trim() ? ` (${reason.trim().slice(0, 100)})` : ""}`, { entity: "review", entityId: id });',
      "  },",
      "});",
      "",
      "/** PUBLIC",
    ),
    "review reject",
  );

  // ---- members (sign-ins + approvals)
  const mem = load("convex/members.ts");
  imp(mem, 'import { getAdmin, requireAdmin, requireSignedIn } from "./adminAuth";');
  replaceOnce(mem, 'import { logEvent } from "./activity";', 'import { logEvent, memberLabel } from "./activity";', "members import label");
  replaceOnce(
    mem,
    L("        createdAt: now,", "        lastSeenAt: now,", "      });", "      return;"),
    L(
      "        createdAt: now,",
      "        lastSeenAt: now,",
      "      });",
      '      await logEvent(ctx, "member.signup", `${next.name ?? next.email ?? "Someone"} signed in for the first time (${approval ? "approved automatically" : "waiting for approval"})`, { entity: "member", entityId: who.userId! });',
      "      return;",
    ),
    "member signup",
  );
  replaceOnce(
    mem,
    '      Object.assign(patch, { status: "approved", approvedAt: approval.approvedAt, approvedBy: approval.approvedBy, teacherId: approval.teacherId ?? row.teacherId });',
    L(
      '      Object.assign(patch, { status: "approved", approvedAt: approval.approvedAt, approvedBy: approval.approvedBy, teacherId: approval.teacherId ?? row.teacherId });',
      '      await logEvent(ctx, "member.auto_approved", `${next.name ?? next.email ?? "Someone"} was approved automatically`, { entity: "member", entityId: who.userId! });',
    ),
    "member auto approve",
  );
  replaceOnce(
    mem,
    L("    await ctx.db.patch(m._id, patch);", "  },", "});", "", "/** Say no"),
    L(
      "    await ctx.db.patch(m._id, patch);",
      '    await logEvent(ctx, "member.approved", `Approved ${m.name ?? m.email ?? "someone"} as ${as}`, { entity: "member", entityId: userId });',
      "  },",
      "});",
      "",
      "/** Say no",
    ),
    "member approve",
  );
  replaceOnce(
    mem,
    '    await ctx.db.patch(m._id, { status: "denied" });',
    L('    await ctx.db.patch(m._id, { status: "denied" });', '    await logEvent(ctx, "member.denied", `Removed access for ${m.name ?? m.email ?? "someone"}`, { entity: "member", entityId: userId });'),
    "member deny",
  );
  replaceOnce(
    mem,
    L("    for (const r of reqs) await ctx.db.delete(r._id);", "  },", "});", "", "/** Back to a normal teacher"),
    L(
      "    for (const r of reqs) await ctx.db.delete(r._id);",
      '    await logEvent(ctx, "admin.made", `Made ${m.name ?? m.email ?? "someone"} an admin`, { entity: "member", entityId: userId });',
      "  },",
      "});",
      "",
      "/** Back to a normal teacher",
    ),
    "member make admin",
  );
  replaceOnce(
    mem,
    L(
      '    const rows = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).collect();',
      "    for (const r of rows) await ctx.db.delete(r._id);",
      "  },",
      "});",
    ),
    L(
      '    const rows = await ctx.db.query("admins").withIndex("by_user", (q) => q.eq("userId", userId)).collect();',
      "    for (const r of rows) await ctx.db.delete(r._id);",
      '    await logEvent(ctx, "admin.removed", `${await memberLabel(ctx, userId)} is no longer an admin`, { entity: "member", entityId: userId });',
      "  },",
      "});",
    ),
    "member remove admin",
  );

  // ---- admins table (requests)
  const adm = load("convex/admins.ts");
  imp(adm, 'import { getAdmin, requireAdmin, requireSignedIn } from "./adminAuth";');
  replaceOnce(
    adm,
    L('    if (existing) await ctx.db.replace(existing._id, doc);', '    else await ctx.db.insert("adminRequests", doc);'),
    L('    if (existing) await ctx.db.replace(existing._id, doc);', '    else await ctx.db.insert("adminRequests", doc);', '    await logEvent(ctx, "admin.requested", `${doc.name ?? doc.email ?? "Someone"} asked to become an admin`, { entity: "member", entityId: doc.userId });'),
    "admin request",
  );
  replaceOnce(
    adm,
    L("    await ctx.db.delete(id);", "  },", "});", "", "export const decline"),
    L(
      "    await ctx.db.delete(id);",
      '    await logEvent(ctx, "admin.made", `Approved the admin request from ${r.name ?? r.email ?? "someone"}`, { entity: "member", entityId: r.userId });',
      "  },",
      "});",
      "",
      "export const decline",
    ),
    "admin approve request",
  );
  replaceOnce(
    adm,
    L("    await requireAdmin(ctx);", "    await ctx.db.delete(id);", "  },", "});", "", "export const remove"),
    L(
      "    await requireAdmin(ctx);",
      "    const req = await ctx.db.get(id);",
      "    await ctx.db.delete(id);",
      '    await logEvent(ctx, "admin.request_declined", `Declined the admin request from ${req?.name ?? req?.email ?? "someone"}`, { entity: "member" });',
      "  },",
      "});",
      "",
      "export const remove",
    ),
    "admin decline request",
  );
  replaceOnce(
    adm,
    L('    if (row.userId === who.userId) throw new ConvexError("You cannot remove yourself.");', "    await ctx.db.delete(id);"),
    L(
      '    if (row.userId === who.userId) throw new ConvexError("You cannot remove yourself.");',
      "    await ctx.db.delete(id);",
      '    await logEvent(ctx, "admin.removed", `${row.name ?? row.email ?? "Someone"} is no longer an admin`, { entity: "member", entityId: row.userId });',
    ),
    "admin remove",
  );

  // ---- announcements
  const ann = load("convex/announcements.ts");
  imp(ann, 'import { isApproved } from "./access";');
  replaceOnce(ann, '    return ctx.db.insert("announcements", {', '    const id = await ctx.db.insert("announcements", {', "announcement open");
  replaceOnce(
    ann,
    L('      createdBy: who.name ?? who.email ?? "Admin",', "    });"),
    L(
      '      createdBy: who.name ?? who.email ?? "Admin",',
      "    });",
      '    await logEvent(ctx, "announcement.created", `Posted announcement "${title}" for ${args.audience.length ? args.audience.join(", ") : "every class"}`, { entity: "announcement", entityId: id });',
      "    return id;",
    ),
    "announcement close",
  );
  replaceOnce(
    ann,
    L("    await requireAdmin(ctx);", "    await ctx.db.delete(id);"),
    L(
      "    await requireAdmin(ctx);",
      "    const gone = await ctx.db.get(id);",
      "    await ctx.db.delete(id);",
      '    await logEvent(ctx, "announcement.removed", `Removed announcement "${gone?.title ?? "unknown"}"`, { entity: "announcement", entityId: id });',
    ),
    "announcement remove",
  );

  // ---- class reading
  const rs = load("convex/readingSets.ts");
  imp(rs, 'import { isApproved } from "./access";');
  replaceOnce(rs, '    return ctx.db.insert("readingSets", {', '    const setId = await ctx.db.insert("readingSets", {', "reading open");
  replaceOnce(
    rs,
    L('      createdBy: who.name ?? who.email ?? "Admin",', "    });"),
    L(
      '      createdBy: who.name ?? who.email ?? "Admin",',
      "    });",
      '    const setBook = await ctx.db.get(args.bookId);',
      '    await logEvent(ctx, "reading.set", `Set "${setBook?.title ?? "a book"}" for ${department} to read`, { entity: "reading", entityId: setId });',
      "    return setId;",
    ),
    "reading close",
  );
  replaceOnce(
    rs,
    L("    await requireAdmin(ctx);", "    await ctx.db.delete(id);"),
    L(
      "    await requireAdmin(ctx);",
      "    const gone = await ctx.db.get(id);",
      "    const goneBook = gone ? await ctx.db.get(gone.bookId) : null;",
      "    await ctx.db.delete(id);",
      '    await logEvent(ctx, "reading.removed", `Removed "${goneBook?.title ?? "a book"}" from ${gone?.department ?? "a class"} reading`, { entity: "reading", entityId: id });',
    ),
    "reading remove",
  );

  // ---- policy + fees settings
  const pol = load("convex/loanPolicy.ts");
  imp(pol, 'import { getPolicy } from "./loanHelpers";');
  replaceOnce(
    pol,
    L('    else await ctx.db.insert("loanPolicy", doc);', "    return { version: doc.version };"),
    L(
      '    else await ctx.db.insert("loanPolicy", doc);',
      '    await logEvent(ctx, "policy.updated", `Updated the borrowing policy (version ${doc.version}), damage fee ${currency} ${args.damageFee}`, { entity: "policy" });',
      "    return { version: doc.version };",
    ),
    "policy save",
  );
  replaceOnce(
    pol,
    "    await ctx.db.patch(bookId, { price });",
    L("    await ctx.db.patch(bookId, { price });", "    const priced = await ctx.db.get(bookId);", '    await logEvent(ctx, "policy.book_price", `Set the replacement price of "${priced?.title ?? "a book"}" to ${price ?? "the default"}`, { entity: "book", entityId: bookId });'),
    "book price",
  );

  // ---- lists (classes, categories, age ranges)
  const set = load("convex/settings.ts");
  imp(set, 'import { v } from "convex/values";');
  replaceOnce(
    set,
    L("    const next = [...current, v2];", "    if (existing) await ctx.db.patch(existing._id, { values: next });", '    else await ctx.db.insert("settings", { key, values: next });'),
    L("    const next = [...current, v2];", "    if (existing) await ctx.db.patch(existing._id, { values: next });", '    else await ctx.db.insert("settings", { key, values: next });', '    await logEvent(ctx, "settings.added", `Added "${v2}" to ${key}`, { entity: "settings" });'),
    "settings add",
  );
  replaceOnce(
    set,
    L("    const next = current.filter((v3: string) => v3 !== value);", "    if (existing) await ctx.db.patch(existing._id, { values: next });", '    else await ctx.db.insert("settings", { key, values: next });'),
    L("    const next = current.filter((v3: string) => v3 !== value);", "    if (existing) await ctx.db.patch(existing._id, { values: next });", '    else await ctx.db.insert("settings", { key, values: next });', '    await logEvent(ctx, "settings.removed", `Removed "${value}" from ${key}`, { entity: "settings" });'),
    "settings remove",
  );

  // ---- admin app: menu item
  const shell = load("src/components/admin-app/AdminShell.tsx");
  replaceOnce(shell, "BookMarked, BookOpenCheck } from \"lucide-react\";", "BookMarked, BookOpenCheck, ScrollText } from \"lucide-react\";", "shell icon");
  replaceOnce(
    shell,
    '  { to: "/admin/fees", label: "Fees", icon: Wallet },',
    L('  { to: "/admin/fees", label: "Fees", icon: Wallet },', '  { to: "/admin/activity", label: "Activity", icon: ScrollText },'),
    "shell nav",
  );
});
