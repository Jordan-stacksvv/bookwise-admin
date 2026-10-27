"use strict";
/**
 * 06 - Loan approval flow, teacher side
 * - After "Assign", a dialog offers "Send on WhatsApp" (policy text + approval link) or "Copy link"
 * - New teacher page /approvals (waiting for parent / waiting for admin / done) in the sidebar
 * - Public page /approve/<token>: the parent reads the policy and taps Approve (no login)
 * - Footer with an "Admin area" link on the login page and in the teacher app
 * Frontend only. Needs patch 05 deployed to Convex first.
 */
const { load, has, replaceOnce, run } = require("./_lib.cjs");
const { createOne, L } = require("./_files.cjs");

const DRY = process.argv.includes("--dry"); // earlier patches are not written in a dry run

run("06 loan approval (teacher side)", () => {
  const store = load("src/lib/mock-store.ts");
  if (has(store, "loanStatus")) return "skip";
  if (!DRY && !has(load("convex/schema.ts"), "loanPolicy")) throw new Error("Run patch 05 first (node patches/05-admin-backend.cjs).");

  for (const f of [
    "src/lib/loan-notice.ts",
    "src/lib/approval-link.ts",
    "src/components/admin/LoanSendPrompt.tsx",
    "src/components/admin/StatusBadge.tsx",
    "src/components/admin/AppFooter.tsx",
    "src/routes/_authenticated/approvals.tsx",
    "src/routes/approve.$token.tsx",
  ]) createOne(f);

  // ---- mock-store.ts
  replaceOnce(
    store,
    'import { MIN_BORROW_AGE } from "../../convex/policy";',
    L('import { MIN_BORROW_AGE, type LoanStatus } from "../../convex/policy";', 'import { announceLoan } from "./loan-notice";'),
    "imports",
  );
  replaceOnce(
    store,
    L("  copies: number;", "  issues: BookIssue[];"),
    L("  copies: number;", "  price?: number;", "  issues: BookIssue[];"),
    "Book.price",
  );
  replaceOnce(
    store,
    L("  currentPage?: number;", "  completed?: boolean;", "};", "", "export type BookReview = {"),
    L(
      "  currentPage?: number;",
      "  completed?: boolean;",
      "  /** undefined = loan made before approvals existed (treated as approved) */",
      "  status?: LoanStatus;",
      "  approvalToken?: string;",
      "  parentApprovedAt?: string;",
      "  parentApprovedName?: string;",
      "  policyVersion?: number;",
      "  adminApprovedAt?: string;",
      "  adminApprovedBy?: string;",
      "  rejectedReason?: string;",
      '  feeKind?: "lost" | "damaged";',
      "  feeAmount?: number;",
      '  feeStatus?: "owed" | "paid" | "waived";',
      "  feeNote?: string;",
      "  feeAt?: string;",
      "};",
      "",
      "export type BookReview = {",
    ),
    "Assignment fields",
  );
  replaceOnce(
    store,
    L(
      "    assign: (bookId: string, kidId: string, dueDate: string, teacherId?: string) =>",
      "      m.assign({",
      "        bookId: bookId as Id<\"books\">,",
      "        kidId: kidId as Id<\"kids\">,",
      "        teacherId: teacherId as Id<\"teachers\"> | undefined,",
      "        dueDate,",
      "      }),",
    ),
    L(
      "    assign: async (bookId: string, kidId: string, dueDate: string, teacherId?: string) => {",
      "      const r = await m.assign({",
      "        bookId: bookId as Id<\"books\">,",
      "        kidId: kidId as Id<\"kids\">,",
      "        teacherId: teacherId as Id<\"teachers\"> | undefined,",
      "        dueDate,",
      "      });",
      "      // Opens the \"send to parent on WhatsApp\" dialog (mounted in the teacher layout).",
      "      announceLoan({",
      "        token: r.token,",
      "        kidName: r.kidName,",
      "        parentName: r.parentName,",
      "        parentPhone: r.parentPhone,",
      "        bookTitle: r.bookTitle,",
      "        dueDate: r.dueDate,",
      "      });",
      "      return r;",
      "    },",
    ),
    "assign",
  );
  replaceOnce(
    store,
    L("export function isOverdue(a: Assignment) {", "  return !a.returnedAt && new Date(a.dueDate) < new Date();", "}"),
    L(
      "/** Loans made before the approval flow existed have no status: treat them as approved. */",
      "export function loanStatus(a: Pick<Assignment, \"status\">): LoanStatus {",
      "  return a.status ?? \"approved\";",
      "}",
      "",
      "// A loan only counts as overdue once it has been handed over (approved).",
      "export function isOverdue(a: Assignment) {",
      "  return !a.returnedAt && loanStatus(a) === \"approved\" && new Date(a.dueDate) < new Date();",
      "}",
    ),
    "isOverdue",
  );

  // ---- teacher layout: send dialog + footer
  const layout = load("src/routes/_authenticated.tsx");
  replaceOnce(
    layout,
    'import { AppSidebar, MobileTopBar } from "@/components/admin/AppSidebar";',
    L(
      'import { AppSidebar, MobileTopBar } from "@/components/admin/AppSidebar";',
      'import { AppFooter } from "@/components/admin/AppFooter";',
      'import { LoanSendPrompt } from "@/components/admin/LoanSendPrompt";',
    ),
    "layout imports",
  );
  replaceOnce(
    layout,
    L('        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">', "          <Outlet />", "        </div>", "      </main>"),
    L(
      '        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">',
      "          <Outlet />",
      "        </div>",
      "        <AppFooter />",
      "      </main>",
      "      <LoanSendPrompt />",
    ),
    "layout body",
  );

  // ---- sidebar: Approvals link
  const side = load("src/components/admin/AppSidebar.tsx");
  replaceOnce(side, "Building2, Download } from \"lucide-react\";", "Building2, Download, ClipboardCheck } from \"lucide-react\";", "icon import");
  replaceOnce(
    side,
    '  { to: "/calendar", label: "Calendar", icon: CalendarDays },',
    L('  { to: "/calendar", label: "Calendar", icon: CalendarDays },', '  { to: "/approvals", label: "Approvals", icon: ClipboardCheck },'),
    "nav item",
  );

  // ---- login page footer
  const login = load("src/routes/login.tsx");
  replaceOnce(login, 'import logo from "@/assets/logo.png";', L('import logo from "@/assets/logo.png";', 'import { AppFooter } from "@/components/admin/AppFooter";'), "login import");
  replaceOnce(
    login,
    L("          </button>", "        </p>", "      </div>", "    </div>", "  );"),
    L("          </button>", "        </p>", "        <AppFooter />", "      </div>", "    </div>", "  );"),
    "login footer",
  );
});
