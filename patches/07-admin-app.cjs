"use strict";
/**
 * 07 - The admin app at /admin
 * - Own layout + sidebar + mobile menu, own installable PWA (admin.webmanifest, admin-badged icons)
 * - Pages: Overview (analytics), Approvals, Announcements, Class reading, Birthdays, Fees, Settings
 * - Teacher dashboard gets a "From the admin" card (announcements + books set for classes)
 * - index.html picks the admin manifest/icon when the URL starts with /admin
 * Frontend only. Needs patches 05 (deployed) and 06.
 */
const path = require("path");
const { load, has, replaceOnce, copyAsset, run } = require("./_lib.cjs");
const { createOne, createTree, L } = require("./_files.cjs");

const ASSETS = path.join(__dirname, "assets");

const DRY = process.argv.includes("--dry"); // earlier patches are not written in a dry run

run("07 admin app", () => {
  const html = load("index.html");
  if (has(html, "admin.webmanifest")) return "skip";
  if (!DRY && !has(load("src/lib/mock-store.ts"), "loanStatus")) throw new Error("Run patch 06 first (node patches/06-loan-approval.cjs).");

  createTree("src/routes/admin");
  for (const f of [
    "src/routes/admin.tsx",
    "src/components/admin-app/ui.tsx",
    "src/components/admin-app/ChargeFeeDialog.tsx",
    "src/components/admin-app/AdminShell.tsx",
    "src/components/admin/AdminNotices.tsx",
    "src/hooks/use-admin.ts",
    "src/hooks/use-admin-alerts.ts",
    "public/admin.webmanifest",
  ]) createOne(f);

  for (const n of ["admin-192.png", "admin-512.png", "admin-maskable-512.png", "admin-apple-touch-icon.png"]) {
    copyAsset(path.join(ASSETS, n), `public/icons/${n}`);
  }

  // ---- index.html: manifest + icon + title chosen by URL, before the browser reads them
  replaceOnce(html, '    <link rel="manifest" href="/manifest.webmanifest" />\n', "", "manifest link");
  replaceOnce(html, '    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />\n', "", "apple icon link");
  replaceOnce(
    html,
    '    <meta name="apple-mobile-web-app-title" content="Book Club" />\n',
    L(
      "    <script>",
      "      // /admin is its own installable app: use the admin manifest, icon and name there.",
      "      (function () {",
      '        var admin = location.pathname === "/admin" || location.pathname.indexOf("/admin/") === 0;',
      '        document.write(\'<link rel="manifest" href="\' + (admin ? "/admin.webmanifest" : "/manifest.webmanifest") + \'" />\');',
      '        document.write(\'<link rel="apple-touch-icon" href="\' + (admin ? "/icons/admin-apple-touch-icon.png" : "/icons/apple-touch-icon.png") + \'" />\');',
      '        document.write(\'<meta name="apple-mobile-web-app-title" content="\' + (admin ? "Book Club Admin" : "Book Club") + \'" />\');',
      '        if (admin) document.title = "Book Club Admin - Madina Central SDA";',
      "      })();",
      "    </script>",
      "",
    ),
    "apple title",
  );

  // ---- service worker: new cache name so existing installs refresh their shell
  const sw = load("public/sw.js");
  replaceOnce(sw, 'const CACHE = "bookwise-shell-v1";', 'const CACHE = "bookwise-shell-v2";', "cache name");

  // ---- teacher dashboard card
  const dash = load("src/routes/_authenticated/dashboard.tsx");
  replaceOnce(
    dash,
    'import { BirthdayCard } from "@/components/admin/BirthdayCard";',
    L('import { BirthdayCard } from "@/components/admin/BirthdayCard";', 'import { AdminNotices } from "@/components/admin/AdminNotices";'),
    "dashboard import",
  );
  replaceOnce(dash, "      <BirthdayCard kids={s.kids} />", L("      <AdminNotices />", "      <BirthdayCard kids={s.kids} />"), "dashboard card");
});
