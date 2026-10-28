"use strict";
/**
 * 11 - Nobody gets in without approval
 * - First sign-in = "pending". An admin approves them (as teacher or admin) in Admin > People; until then they only see
 *   a "waiting for approval" screen, which takes them in by itself once approved.
 * - Approving as a teacher links them to a teacher on your Teachers page, or creates that teacher record.
 * - If you add a teacher (with their email) BEFORE they sign in and your Clerk token carries the email, they are approved automatically.
 * - The server now refuses all book/kid/teacher/loan/review data to anyone who is not approved (not just the screens).
 * - Admin app: People page with a badge; waiting counts on Reviews / Approvals / People.
 * Run from the project root, then:  npx convex dev --once
 */
const { load, has, replaceOnce, run } = require("./_lib.cjs");
const { createFrom, overwriteFrom, L } = require("./_files.cjs");

const DIR = "files11";
const DRY = process.argv.includes("--dry");

run("11 access approval", () => {
  const schema = load("convex/schema.ts");
  if (has(schema, "approvedBy")) return "skip";
  if (!DRY && !has(schema, "shareToken")) throw new Error("Apply patch 10 first.");

  // ---- backend core
  createFrom(DIR, "convex/access.ts");
  createFrom(DIR, "convex/secure.ts");
  overwriteFrom(DIR, "convex/members.ts");
  replaceOnce(
    schema,
    L('    role: v.optional(v.union(v.literal("teacher"), v.literal("admin"))),', "    createdAt: v.string(),", "    lastSeenAt: v.string(),"),
    L(
      '    role: v.optional(v.union(v.literal("teacher"), v.literal("admin"))), // what they picked on the login page',
      "    // pending until an admin approves. undefined (recorded before approvals existed) counts as pending.",
      '    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"))),',
      "    approvedAt: v.optional(v.string()),",
      "    approvedBy: v.optional(v.string()),",
      '    teacherId: v.optional(v.id("teachers")),',
      "    createdAt: v.string(),",
      "    lastSeenAt: v.string(),",
    ),
    "members status",
  );
  const api = load("convex/_generated/api.d.ts");
  if (!has(api, "as access from")) {
    replaceOnce(api, 'import type * as adminAuth from "../adminAuth.js";', L('import type * as access from "../access.js";', 'import type * as adminAuth from "../adminAuth.js";'), "api import");
    replaceOnce(api, "  adminAuth: typeof adminAuth;", L("  access: typeof access;", "  adminAuth: typeof adminAuth;"), "api module");
  }

  // ---- guard every existing data module: same query/mutation, but only for approved people
  for (const f of ["books", "kids", "teachers", "assignments", "settings", "vocab"]) {
    const m = load(`convex/${f}.ts`);
    replaceOnce(m, 'import { mutation, query } from "./_generated/server";', 'import { mutation, query } from "./secure";', `${f} import`);
  }

  // ---- modules written in earlier batches: use "approved" instead of just "signed in"
  const ann = load("convex/announcements.ts");
  replaceOnce(ann, 'import { getAdmin, requireAdmin } from "./adminAuth";', L('import { getAdmin, requireAdmin } from "./adminAuth";', 'import { isApproved } from "./access";'), "announcements import");
  replaceOnce(ann, L("    const who = await getAdmin(ctx);", "    if (!who.signedIn) return [];"), "    if (!(await isApproved(ctx))) return [];", "announcements list");
  const rs = load("convex/readingSets.ts");
  replaceOnce(rs, 'import { getAdmin, requireAdmin } from "./adminAuth";', L('import { getAdmin, requireAdmin } from "./adminAuth";', 'import { isApproved } from "./access";'), "readingSets import");
  replaceOnce(rs, L("    const who = await getAdmin(ctx);", "    if (!who.signedIn) return [];"), "    if (!(await isApproved(ctx))) return [];", "readingSets list");
  const loans = load("convex/loans.ts");
  replaceOnce(loans, 'import { getAdmin, requireAdmin, requireSignedIn } from "./adminAuth";', L('import { getAdmin, requireAdmin } from "./adminAuth";', 'import { requireApproved } from "./access";'), "loans import");
  replaceOnce(loans, "    await requireSignedIn(ctx);", "    await requireApproved(ctx);", "loans cancel");

  // ---- screens
  for (const f of [
    "src/components/admin/AccessGate.tsx",
    "src/components/admin-app/PeoplePanel.tsx",
    "src/components/admin-app/PeopleWaiting.tsx",
    "src/routes/admin/people.tsx",
  ]) createFrom(DIR, f);
  overwriteFrom(DIR, "src/components/admin-app/AdminShell.tsx");
  overwriteFrom(DIR, "src/routes/admin.tsx");

  // ---- teacher app: wrap in the gate (MemberSync stays outside it so new people are recorded)
  const layout = load("src/routes/_authenticated.tsx");
  replaceOnce(
    layout,
    'import { MemberSync } from "@/components/admin/MemberSync";',
    L('import { MemberSync } from "@/components/admin/MemberSync";', 'import { AccessGate } from "@/components/admin/AccessGate";'),
    "layout import",
  );
  replaceOnce(
    layout,
    L("  return (", '    <div className="flex min-h-screen w-full bg-background">', "      <AppSidebar />"),
    L("  return (", "    <>", "      <MemberSync />", "      <AccessGate>", '    <div className="flex min-h-screen w-full bg-background">', "      <AppSidebar />"),
    "layout open",
  );
  replaceOnce(
    layout,
    L("      <LoanSendPrompt />", "      <MemberSync />", "    </div>", "  );"),
    L("      <LoanSendPrompt />", "    </div>", "      </AccessGate>", "    </>", "  );"),
    "layout close",
  );

  // ---- admin app: People moves out of Settings; overview strip
  const settings = load("src/routes/admin/settings.tsx");
  replaceOnce(settings, 'import { AdminsPanel } from "@/components/admin-app/AdminsPanel";\n', "", "settings import");
  replaceOnce(settings, "        <AdminsPanel />\n", "", "settings panel");
  const idx = load("src/routes/admin/index.tsx");
  replaceOnce(
    idx,
    'import { BirthdayCard } from "@/components/admin/BirthdayCard";',
    L('import { BirthdayCard } from "@/components/admin/BirthdayCard";', 'import { PeopleWaiting } from "@/components/admin-app/PeopleWaiting";'),
    "overview import",
  );
  replaceOnce(idx, "      <BirthdayCard kids={s.kids} />", L("      <PeopleWaiting />", "", "      <BirthdayCard kids={s.kids} />"), "overview strip");
});
