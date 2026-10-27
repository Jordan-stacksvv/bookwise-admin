"use strict";
/**
 * 05 - Admin backend (Convex)
 * - convex/adminAuth.ts     server-side admin check (ADMIN_EMAILS env var, or Clerk role claim)
 * - convex/loans.ts         parent approval by link, admin final approval, lost/damaged fees
 * - convex/loanPolicy.ts    editable policy text + damage fee + per-book price
 * - convex/announcements.ts, convex/readingSets.ts
 * - schema: loan status/approval fields on assignments, price on books, 3 new tables
 * - assignments.assign now starts every loan as "pending_parent" and returns the approval token
 *
 * Run from project root:  node patches/05-admin-backend.cjs   then deploy Convex.
 */
const { load, has, replaceOnce, create, run, exists } = require("./_lib.cjs");
const { createOne, L } = require("./_files.cjs");
const fs = require("fs");
const path = require("path");

run("05 admin backend", () => {
  const schema = load("convex/schema.ts");
  if (has(schema, "loanPolicy")) return "skip";
  if (!exists("convex/policy.ts")) throw new Error("convex/policy.ts is missing - apply batch 1 (patches 01-04) first.");

  // ---- new modules
  for (const f of ["adminAuth", "loanHelpers", "loanPolicy", "announcements", "readingSets", "loans"]) createOne(`convex/${f}.ts`);

  // ---- policy.ts: defaults shared by server + client
  const policy = load("convex/policy.ts");
  if (!has(policy, "DEFAULT_POLICY_TEXT")) {
    policy.text = policy.text.replace(/\s*$/, "\n") + fs.readFileSync(path.join(__dirname, "snip", "policy-append.txt"), "utf8");
  }

  // ---- schema.ts
  replaceOnce(
    schema,
    L('    code: v.optional(v.string()),', '  }).index("by_code", ["code"]),'),
    L('    code: v.optional(v.string()),', "    price: v.optional(v.number()), // replacement cost; falls back to the default damage fee", '  }).index("by_code", ["code"]),'),
    "books.price",
  );
  replaceOnce(
    schema,
    L("    completed: v.optional(v.boolean()),", "  })", '    .index("by_book", ["bookId"])', '    .index("by_kid", ["kidId"]),'),
    L(
      "    completed: v.optional(v.boolean()),",
      "    // --- approval flow (batch 2). status undefined = a loan made before approvals existed (treated as approved).",
      "    status: v.optional(",
      "      v.union(",
      '        v.literal("pending_parent"),',
      '        v.literal("pending_admin"),',
      '        v.literal("approved"),',
      '        v.literal("rejected"),',
      '        v.literal("cancelled"),',
      '        v.literal("lost"),',
      "      ),",
      "    ),",
      "    approvalToken: v.optional(v.string()),",
      "    parentApprovedAt: v.optional(v.string()),",
      "    parentApprovedName: v.optional(v.string()),",
      "    policyVersion: v.optional(v.number()),",
      "    adminApprovedAt: v.optional(v.string()),",
      "    adminApprovedBy: v.optional(v.string()),",
      "    rejectedReason: v.optional(v.string()),",
      "    // --- lost / damaged fees",
      '    feeKind: v.optional(v.union(v.literal("lost"), v.literal("damaged"))),',
      "    feeAmount: v.optional(v.number()),",
      '    feeStatus: v.optional(v.union(v.literal("owed"), v.literal("paid"), v.literal("waived"))),',
      "    feeNote: v.optional(v.string()),",
      "    feeAt: v.optional(v.string()),",
      "  })",
      '    .index("by_book", ["bookId"])',
      '    .index("by_kid", ["kidId"])',
      '    .index("by_token", ["approvalToken"]),',
    ),
    "assignments approval fields",
  );
  replaceOnce(
    schema,
    L('    .index("by_kid", ["kidId"])', '    .index("by_assignment", ["assignmentId"]),', "});"),
    L(
      '    .index("by_kid", ["kidId"])',
      '    .index("by_assignment", ["assignmentId"]),',
      "",
      "  // One row (the current policy). Missing row = built-in defaults from convex/policy.ts.",
      '  loanPolicy: defineTable({',
      "    text: v.string(),",
      "    damageFee: v.number(),",
      "    currency: v.string(),",
      "    version: v.number(),",
      "    updatedAt: v.string(),",
      "  }),",
      "",
      '  announcements: defineTable({',
      "    title: v.string(),",
      "    body: v.string(),",
      "    audience: v.array(v.string()), // class names; empty = everyone",
      "    expiresAt: v.optional(v.string()),",
      "    createdAt: v.string(),",
      "    createdBy: v.string(),",
      "  }),",
      "",
      '  readingSets: defineTable({',
      '    bookId: v.id("books"),',
      "    department: v.string(),",
      "    dueDate: v.optional(v.string()),",
      "    note: v.optional(v.string()),",
      "    createdAt: v.string(),",
      "    createdBy: v.string(),",
      "  }),",
      "});",
    ),
    "new tables",
  );

  // ---- assignments.ts
  const asg = load("convex/assignments.ts");
  replaceOnce(
    asg,
    'import { MIN_BORROW_AGE, ageOn } from "./policy";',
    L('import { MIN_BORROW_AGE, ageOn } from "./policy";', 'import { newToken } from "./loanHelpers";'),
    "imports",
  );
  replaceOnce(
    asg,
    L("export const list = query({", "  args: {},", '  handler: async (ctx) => ctx.db.query("assignments").collect(),', "});"),
    L(
      "export const list = query({",
      "  args: {},",
      "  handler: async (ctx) => {",
      '    const rows = await ctx.db.query("assignments").collect();',
      "    // The parent-approval token is a secret link: only signed-in users get it.",
      "    if (await ctx.auth.getUserIdentity()) return rows;",
      "    return rows.map(({ approvalToken: _t, ...rest }) => rest);",
      "  },",
      "});",
    ),
    "list hides tokens when signed out",
  );
  replaceOnce(
    asg,
    L('    return ctx.db.insert("assignments", {', "      ...args,", "      assignedAt: new Date().toISOString(),", "    });"),
    L(
      '    const book = await ctx.db.get(args.bookId);',
      '    if (!book) throw new ConvexError("Book not found.");',
      "    // New loans wait for the parent (link sent by WhatsApp), then for the admin.",
      "    const token = newToken();",
      '    const id = await ctx.db.insert("assignments", {',
      "      ...args,",
      "      assignedAt: new Date().toISOString(),",
      '      status: "pending_parent",',
      "      approvalToken: token,",
      "    });",
      "    return {",
      "      id,",
      "      token,",
      "      kidName: kid.name,",
      "      parentName: kid.parentName,",
      "      parentPhone: kid.parentPhone,",
      "      bookTitle: book.title,",
      "      dueDate: args.dueDate,",
      "    };",
    ),
    "assign -> pending_parent",
  );

  // ---- generated api typings (npx convex dev/deploy regenerates this file; patched so the app type-checks meanwhile)
  const api = load("convex/_generated/api.d.ts");
  if (!has(api, "adminAuth")) {
    replaceOnce(
      api,
      'import type * as assignments from "../assignments.js";',
      L(
        'import type * as adminAuth from "../adminAuth.js";',
        'import type * as announcements from "../announcements.js";',
        'import type * as assignments from "../assignments.js";',
      ),
      "api imports 1",
    );
    replaceOnce(
      api,
      'import type * as kids from "../kids.js";',
      L('import type * as kids from "../kids.js";', 'import type * as loanHelpers from "../loanHelpers.js";', 'import type * as loanPolicy from "../loanPolicy.js";', 'import type * as loans from "../loans.js";', 'import type * as readingSets from "../readingSets.js";'),
      "api imports 2",
    );
    replaceOnce(
      api,
      "  assignments: typeof assignments;",
      L("  adminAuth: typeof adminAuth;", "  announcements: typeof announcements;", "  assignments: typeof assignments;"),
      "api modules 1",
    );
    replaceOnce(
      api,
      "  kids: typeof kids;",
      L("  kids: typeof kids;", "  loanHelpers: typeof loanHelpers;", "  loanPolicy: typeof loanPolicy;", "  loans: typeof loans;", "  readingSets: typeof readingSets;"),
      "api modules 2",
    );
  }
});
