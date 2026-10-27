"use strict";
/**
 * 09 - "Who are you?" login, people list with Make admin, cleaner admin screen
 * - New login page: pick Teacher or Admin first, then a restyled sign-in; signed-in people just pick where to go
 * - Everyone who signs in is recorded (members); Admin > Settings > People shows them with "Make admin" / "Remove admin"
 * - Picking "Admin" and not being one sends the admin request automatically
 * - Removed: the "very first admin" box, the "Admin area" footer link and the sidebar admin link in the teacher app
 * Run from project root, then:  npx convex dev --once
 */
const { load, has, replaceOnce, run } = require("./_lib.cjs");
const { createFrom, overwriteFrom, L } = require("./_files.cjs");

const DIR = "files09";
const DRY = process.argv.includes("--dry");

run("09 login + members", () => {
  const schema = load("convex/schema.ts");
  if (has(schema, "members: defineTable")) return "skip";
  if (!DRY && !has(schema, "adminRequests")) throw new Error("Apply patch 08 first.");

  // ---- backend
  createFrom(DIR, "convex/members.ts");
  replaceOnce(
    schema,
    "  // Admins approved inside the app (Admin > Settings > Admins). Identified by the Clerk user id.",
    L(
      "  // Everyone who has signed in (for the admin People list). role = what they picked on the login page.",
      "  members: defineTable({",
      "    userId: v.string(),",
      "    name: v.optional(v.string()),",
      "    email: v.optional(v.string()),",
      "    imageUrl: v.optional(v.string()),",
      '    role: v.optional(v.union(v.literal("teacher"), v.literal("admin"))),',
      "    createdAt: v.string(),",
      "    lastSeenAt: v.string(),",
      '  }).index("by_user", ["userId"]),',
      "",
      "  // Admins approved inside the app (Admin > Settings > People). Identified by the Clerk user id.",
    ),
    "members table",
  );
  const api = load("convex/_generated/api.d.ts");
  if (!has(api, "as members from")) {
    replaceOnce(api, 'import type * as loans from "../loans.js";', L('import type * as loans from "../loans.js";', 'import type * as members from "../members.js";'), "api import");
    replaceOnce(api, "  loans: typeof loans;", L("  loans: typeof loans;", "  members: typeof members;"), "api module");
  }

  // ---- frontend
  createFrom(DIR, "src/components/admin/MemberSync.tsx");
  overwriteFrom(DIR, "src/components/admin/AppFooter.tsx");
  overwriteFrom(DIR, "src/components/admin/ProfileCard.tsx");
  overwriteFrom(DIR, "src/components/admin-app/AdminsPanel.tsx");
  overwriteFrom(DIR, "src/routes/admin.tsx");
  overwriteFrom(DIR, "src/routes/login.tsx");

  // ---- teacher layout: record who is using the app
  const layout = load("src/routes/_authenticated.tsx");
  replaceOnce(
    layout,
    'import { LoanSendPrompt } from "@/components/admin/LoanSendPrompt";',
    L('import { LoanSendPrompt } from "@/components/admin/LoanSendPrompt";', 'import { MemberSync } from "@/components/admin/MemberSync";'),
    "layout import",
  );
  replaceOnce(layout, "      <LoanSendPrompt />", L("      <LoanSendPrompt />", "      <MemberSync />"), "layout mount");

  // ---- teacher sidebar: no admin link
  const side = load("src/components/admin/AppSidebar.tsx");
  replaceOnce(side, L('import { useInstallPrompt } from "@/hooks/use-install-prompt";', 'import { AdminLink } from "@/components/admin/AdminLink";'), 'import { useInstallPrompt } from "@/hooks/use-install-prompt";', "sidebar import");
  replaceOnce(
    side,
    L(
      '        <AdminLink className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent transition" />',
      "        <button",
      "          onClick={handleSignOut}",
    ),
    L("        <button", "          onClick={handleSignOut}"),
    "sidebar link",
  );
});
