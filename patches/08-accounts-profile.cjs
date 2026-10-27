"use strict";
/**
 * 08 - Accounts: fix "Admins only" for real admins, request/approve admins in-app, profile pages, one login
 * - Admin check no longer depends on the email being in the Clerk token (it often is not).
 *   Admin = approved in Admin > Settings > Admins, OR Clerk user id in ADMIN_USER_IDS (first admin), OR old ADMIN_EMAILS / role claim.
 * - Teachers tap "Request admin access"; an admin approves it in Settings > Admins.
 * - /admin uses the normal /login page (and returns to /admin after signing in)
 * - Profile page for teachers (/profile) and admins (/admin/profile): name, photo, role, install, sign out
 * Run from project root, then:  npx convex dev --once   (or deploy)
 */
const { load, has, replaceOnce, run } = require("./_lib.cjs");
const { createFrom, overwriteFrom, L } = require("./_files.cjs");

const DIR = "files08";
const DRY = process.argv.includes("--dry");

run("08 accounts + profile", () => {
  const schema = load("convex/schema.ts");
  if (has(schema, "adminRequests")) return "skip";
  if (!DRY && !has(schema, "loanPolicy")) throw new Error("Apply patches 05-07 first.");

  // ---- backend
  overwriteFrom(DIR, "convex/adminAuth.ts");
  createFrom(DIR, "convex/admins.ts");
  replaceOnce(
    schema,
    "  announcements: defineTable({",
    L(
      "  // Admins approved inside the app (Admin > Settings > Admins). Identified by the Clerk user id.",
      "  admins: defineTable({",
      "    userId: v.string(),",
      "    name: v.optional(v.string()),",
      "    email: v.optional(v.string()),",
      "    addedBy: v.string(),",
      "    createdAt: v.string(),",
      '  }).index("by_user", ["userId"]),',
      "",
      "  adminRequests: defineTable({",
      "    userId: v.string(),",
      "    name: v.optional(v.string()),",
      "    email: v.optional(v.string()),",
      "    createdAt: v.string(),",
      '  }).index("by_user", ["userId"]),',
      "",
      "  announcements: defineTable({",
    ),
    "admins tables",
  );
  const api = load("convex/_generated/api.d.ts");
  if (!has(api, "as admins from")) {
    replaceOnce(api, 'import type * as adminAuth from "../adminAuth.js";', L('import type * as adminAuth from "../adminAuth.js";', 'import type * as admins from "../admins.js";'), "api import");
    replaceOnce(api, "  adminAuth: typeof adminAuth;", L("  adminAuth: typeof adminAuth;", "  admins: typeof admins;"), "api module");
  }

  // ---- frontend: new + replaced files
  overwriteFrom(DIR, "src/hooks/use-admin.ts");
  overwriteFrom(DIR, "src/routes/admin.tsx");
  for (const f of [
    "src/components/admin/ProfileCard.tsx",
    "src/components/admin/AdminLink.tsx",
    "src/components/admin-app/AdminsPanel.tsx",
    "src/routes/_authenticated/profile.tsx",
    "src/routes/admin/profile.tsx",
  ]) createFrom(DIR, f);

  // ---- settings page: Admins panel instead of the env-var note
  const settings = load("src/routes/admin/settings.tsx");
  replaceOnce(
    settings,
    'import { Panel, fmtDateTime } from "@/components/admin-app/ui";',
    L('import { AdminsPanel } from "@/components/admin-app/AdminsPanel";', 'import { Panel, fmtDateTime } from "@/components/admin-app/ui";'),
    "settings import",
  );
  replaceOnce(settings, "        <AccessPanel />", "        <AdminsPanel />", "settings panel");

  // ---- admin shell: Profile link
  const shell = load("src/components/admin-app/AdminShell.tsx");
  replaceOnce(shell, "Settings, Wallet, BookMarked } from \"lucide-react\";", "Settings, UserCircle, Wallet, BookMarked } from \"lucide-react\";", "shell icons");
  replaceOnce(
    shell,
    '  { to: "/admin/settings", label: "Settings", icon: Settings },',
    L('  { to: "/admin/settings", label: "Settings", icon: Settings },', '  { to: "/admin/profile", label: "My profile", icon: UserCircle },'),
    "shell nav",
  );

  // ---- teacher sidebar: Profile link + Admin app link (admins only)
  const side = load("src/components/admin/AppSidebar.tsx");
  replaceOnce(side, "Building2, Download, ClipboardCheck } from \"lucide-react\";", "Building2, Download, ClipboardCheck, UserCircle } from \"lucide-react\";", "sidebar icons");
  replaceOnce(
    side,
    'import { useInstallPrompt } from "@/hooks/use-install-prompt";',
    L('import { useInstallPrompt } from "@/hooks/use-install-prompt";', 'import { AdminLink } from "@/components/admin/AdminLink";'),
    "sidebar import",
  );
  replaceOnce(
    side,
    '  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },',
    L('  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },', '  { to: "/profile", label: "My profile", icon: UserCircle },'),
    "sidebar nav",
  );
  replaceOnce(
    side,
    L("        <button", "          onClick={handleSignOut}"),
    L(
      '        <AdminLink className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent transition" />',
      "        <button",
      "          onClick={handleSignOut}",
    ),
    "sidebar admin link",
  );

  // ---- login page: honour ?redirect=/admin
  const login = load("src/routes/login.tsx");
  replaceOnce(
    login,
    L('export const Route = createFileRoute("/login")({', "  component: LoginPage,", "});"),
    L(
      "// Only allow same-site paths like /admin (never //evil.com or full URLs).",
      'const safeRedirect = (v: unknown) => (typeof v === "string" && /^\\/(?![/\\\\])/.test(v) ? v : undefined);',
      "",
      'export const Route = createFileRoute("/login")({',
      "  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({ redirect: safeRedirect(s.redirect) }),",
      "  component: LoginPage,",
      "});",
    ),
    "login route",
  );
  replaceOnce(
    login,
    '  const [mode, setMode] = useState<"signin" | "signup">("signin");',
    L('  const [mode, setMode] = useState<"signin" | "signup">("signin");', '  const after = Route.useSearch().redirect ?? "/dashboard";'),
    "login after url",
  );
  replaceOnce(login, '            afterSignInUrl="/dashboard"', "            forceRedirectUrl={after}", "signin redirect");
  replaceOnce(login, '            afterSignUpUrl="/dashboard"', "            forceRedirectUrl={after}", "signup redirect");
});
