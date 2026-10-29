"use strict";
/**
 * 13 - Profile menu in the sidebar footer (teacher + admin), review upload where a book is given,
 *      and every approved review visible on its book.
 */
const { load, has, replaceOnce, run } = require("./_lib.cjs");
const { createFrom, L } = require("./_files.cjs");

const DIR = "files13";

/** Replace everything from `start` up to and including `end` (both must be found exactly once in that order). */
function between(f, start, end, repl, label) {
  const s = f.text.indexOf(start);
  if (s < 0 || f.text.indexOf(start, s + 1) >= 0) throw new Error(`${f.rel}: could not find a single "${label}" start`);
  const e = f.text.indexOf(end, s);
  if (e < 0) throw new Error(`${f.rel}: could not find the end of "${label}"`);
  replaceOnce(f, f.text.slice(s, e + end.length), repl, label);
}

run("13 sidebar + reviews", () => {
  const shell = load("src/components/admin-app/AdminShell.tsx");
  if (has(shell, "SidebarProfile")) return "skip";

  createFrom(DIR, "src/components/admin/SidebarProfile.tsx");
  createFrom(DIR, "src/components/admin/ReviewDialog.tsx");
  createFrom(DIR, "src/components/admin/BookReviewsDialog.tsx");

  // ---------- admin sidebar
  replaceOnce(
    shell,
    'import { Cake, ClipboardCheck, Download, LayoutDashboard, LogOut, Megaphone, Menu, Settings, UserCircle, Users, Wallet, BookMarked, BookOpenCheck, ScrollText } from "lucide-react";',
    'import { Cake, ClipboardCheck, LayoutDashboard, Megaphone, Menu, Settings, Users, Wallet, BookMarked, BookOpenCheck, ScrollText } from "lucide-react";',
    "admin icons",
  );
  replaceOnce(shell, 'import { useClerk } from "@clerk/clerk-react";\n', "", "admin clerk import");
  replaceOnce(shell, 'import { useInstallPrompt } from "@/hooks/use-install-prompt";', 'import { SidebarProfile } from "@/components/admin/SidebarProfile";', "admin profile import");
  replaceOnce(shell, '  { to: "/admin/profile", label: "My profile", icon: UserCircle },\n', "", "admin nav profile");
  replaceOnce(
    shell,
    L("  const { signOut } = useClerk();", "  const { canInstall, showIosHint, install } = useInstallPrompt();"),
    "",
    "admin navlist hooks",
  );
  replaceOnce(shell, 'className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border"', 'className="px-5 py-4 flex items-center gap-3 border-b border-sidebar-border"', "admin header pad");
  replaceOnce(shell, 'className="flex-1 p-3 space-y-1 overflow-y-auto"', 'className="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto"', "admin nav class");
  replaceOnce(shell, "px-3 py-3 rounded-lg text-sm transition-all", "px-3 py-2 rounded-lg text-sm transition-all", "admin link pad");
  between(
    shell,
    '      <div className="p-3 border-t border-sidebar-border space-y-1"',
    "          <LogOut className=\"h-4 w-4\" /> Sign out\n        </button>\n      </div>\n",
    '      <SidebarProfile app="admin" onNavigate={onNavigate} />\n',
    "admin footer",
  );
  replaceOnce(shell, "flex-col bg-sidebar text-sidebar-foreground h-screen sticky top-0", "flex-col bg-sidebar text-sidebar-foreground h-[100dvh] sticky top-0", "admin aside height");

  // ---------- teacher sidebar
  const side = load("src/components/admin/AppSidebar.tsx");
  replaceOnce(
    side,
    'import { Link, useRouterState, useNavigate } from "@tanstack/react-router";',
    'import { Link, useRouterState } from "@tanstack/react-router";',
    "teacher router import",
  );
  replaceOnce(
    side,
    'import { LayoutDashboard, BookOpen, Users, CalendarDays, LogOut, GraduationCap, Menu, Building2, Download, ClipboardCheck, UserCircle, BookOpenCheck } from "lucide-react";',
    'import { LayoutDashboard, BookOpen, Users, CalendarDays, GraduationCap, Menu, Building2, ClipboardCheck, BookOpenCheck } from "lucide-react";',
    "teacher icons",
  );
  replaceOnce(side, 'import { useClerk } from "@clerk/clerk-react";\n', "", "teacher clerk import");
  replaceOnce(side, 'import { useInstallPrompt } from "@/hooks/use-install-prompt";', 'import { SidebarProfile } from "@/components/admin/SidebarProfile";', "teacher profile import");
  replaceOnce(side, '  { to: "/profile", label: "My profile", icon: UserCircle },\n', "", "teacher nav profile");
  between(
    side,
    "  const navigate = useNavigate();",
    "    onNavigate?.();\n  };\n",
    "",
    "teacher hooks",
  );
  replaceOnce(side, 'className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border"', 'className="px-5 py-4 flex items-center gap-3 border-b border-sidebar-border"', "teacher header pad");
  replaceOnce(side, '<nav className="flex-1 p-3 space-y-1">', '<nav className="flex-1 min-h-0 p-3 space-y-0.5 overflow-y-auto">', "teacher nav class");
  between(
    side,
    '      <div className="p-3 border-t border-sidebar-border">',
    "          <LogOut className=\"h-4 w-4\" /> Sign out\n        </button>\n      </div>\n",
    '      <SidebarProfile app="teacher" onNavigate={onNavigate} />\n',
    "teacher footer",
  );
  replaceOnce(side, "text-sidebar-foreground min-h-screen sticky top-0", "text-sidebar-foreground h-[100dvh] sticky top-0", "teacher aside height");
  replaceOnce(
    side,
    'className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border"',
    'className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 pb-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}',
    "teacher topbar safe area",
  );

  // ---------- kids page: use the shared review dialog
  const kids = load("src/routes/_authenticated/kids.tsx");
  replaceOnce(kids, 'import { useReviewPhotoUpload } from "@/lib/review-photo";', 'import { ReviewDialog, type ReviewTarget } from "@/components/admin/ReviewDialog";', "kids import");
  between(
    kids,
    "  const [reviewFor, setReviewFor] = useState<{",
    "  const uploadPhoto = useReviewPhotoUpload();\n",
    "  const [reviewFor, setReviewFor] = useState<ReviewTarget | null>(null);\n",
    "kids review state",
  );
  between(
    kids,
    "  const submitReview = async () => {",
    "      setReviewBusy(false);\n    }\n  };\n\n",
    "",
    "kids submitReview",
  );
  replaceOnce(
    kids,
    "onClick={() => setReviewFor({ assignmentId: a.id, kidId: k.id, bookId: a.bookId })}",
    'onClick={() => setReviewFor({ assignmentId: a.id, kidId: k.id, bookId: a.bookId, bookTitle: book?.title ?? "", kidName: k.name })}',
    "kids review button",
  );
  between(
    kids,
    "      <Dialog open={!!reviewFor}",
    "      </Dialog>\n\n",
    "      <ReviewDialog target={reviewFor} onClose={() => setReviewFor(null)} />\n\n",
    "kids review dialog",
  );

  // ---------- dashboard: Review button right on each active loan
  const dash = load("src/routes/_authenticated/dashboard.tsx");
  replaceOnce(dash, 'import { useStore, useApi, isOverdue, isActive } from "@/lib/mock-store";', 'import { useStore, useApi, isOverdue, isActive, loanStatus } from "@/lib/mock-store";\nimport { ReviewDialog, type ReviewTarget } from "@/components/admin/ReviewDialog";', "dash import");
  replaceOnce(dash, "GraduationCap, Search, RotateCcw }", "GraduationCap, Search, RotateCcw, BookOpenCheck }", "dash icon");
  replaceOnce(dash, '  const [q, setQ] = useState("");', L('  const [q, setQ] = useState("");', "  const [reviewFor, setReviewFor] = useState<ReviewTarget | null>(null);"), "dash state");
  replaceOnce(
    dash,
    '                  <div className="flex items-center gap-2 shrink-0">',
    '                  <div className="flex flex-wrap items-center gap-2 shrink-0">',
    "dash row wrap",
  );
  replaceOnce(
    dash,
    L('                    <Button size="sm" variant="outline" onClick={() => api.returnBook(a.id)}>'),
    L(
      '                    {loanStatus(a) === "approved" && (',
      '                      <Button size="sm" variant="outline" onClick={() => setReviewFor({ assignmentId: a.id, kidId: a.kidId, bookId: a.bookId, bookTitle: book?.title ?? "", kidName: kid?.name ?? "" })}>',
      '                        <BookOpenCheck className="h-3.5 w-3.5 mr-1.5" /> Review',
      "                      </Button>",
      "                    )}",
      '                    <Button size="sm" variant="outline" onClick={() => api.returnBook(a.id)}>',
    ),
    "dash review button",
  );
  replaceOnce(
    dash,
    "      <AdminNotices />",
    L("      <ReviewDialog target={reviewFor} onClose={() => setReviewFor(null)} />", "      <AdminNotices />"),
    "dash dialog",
  );

  // ---------- books page: see every approved review of a book
  const books = load("src/routes/_authenticated/books.tsx");
  replaceOnce(books, 'import { friendlyError } from "@/lib/friendly-error";', L('import { friendlyError } from "@/lib/friendly-error";', 'import { BookReviewsDialog } from "@/components/admin/BookReviewsDialog";'), "books import");
  replaceOnce(books, "AlertCircle, X, Check }", "AlertCircle, X, Check, MessageSquareText }", "books icon");
  replaceOnce(books, "  const [assignFor, setAssignFor] = useState<Book | null>(null);", L("  const [assignFor, setAssignFor] = useState<Book | null>(null);", "  const [reviewsFor, setReviewsFor] = useState<Book | null>(null);"), "books state");
  replaceOnce(
    books,
    '                        <Button size="sm" variant="ghost" disabled={avail === 0}',
    L(
      '                        <Button size="sm" variant="ghost" className="relative" aria-label="Reviews" onClick={() => setReviewsFor(b)}>',
      '                          <MessageSquareText className="h-4 w-4" />',
      '                          {s.reviews.some((r) => r.bookId === b.id && r.status === "approved") && (',
      '                            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">{s.reviews.filter((r) => r.bookId === b.id && r.status === "approved").length}</span>',
      "                          )}",
      "                        </Button>",
      '                        <Button size="sm" variant="ghost" disabled={avail === 0}',
    ),
    "books reviews button",
  );
  replaceOnce(
    books,
    "      <Dialog open={!!manageOpen}",
    L("      <BookReviewsDialog book={reviewsFor} onClose={() => setReviewsFor(null)} />", "", "      <Dialog open={!!manageOpen}"),
    "books dialog",
  );
});
