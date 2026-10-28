import { Link, useRouterState } from "@tanstack/react-router";
import { useClerk } from "@clerk/clerk-react";
import { Cake, ClipboardCheck, Download, LayoutDashboard, LogOut, Megaphone, Menu, Settings, UserCircle, Users, Wallet, BookMarked, BookOpenCheck, ScrollText } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState, type ReactNode } from "react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAdminAlerts } from "@/hooks/use-admin-alerts";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { birthdaysInMonth } from "@/lib/birthdays";
import { isOverdue, loanStatus, useStore } from "@/lib/mock-store";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/approvals", label: "Approvals", icon: ClipboardCheck, badge: "loans" },
  { to: "/admin/reviews", label: "Reviews", icon: BookOpenCheck, badge: "reviews" },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/reading", label: "Class reading", icon: BookMarked },
  { to: "/admin/birthdays", label: "Birthdays", icon: Cake },
  { to: "/admin/fees", label: "Fees", icon: Wallet },
  { to: "/admin/activity", label: "Activity", icon: ScrollText },
  { to: "/admin/people", label: "People", icon: Users, badge: "people" },
  { to: "/admin/settings", label: "Settings", icon: Settings },
  { to: "/admin/profile", label: "My profile", icon: UserCircle },
] as const;

type Badges = { loans: number; reviews: number; people: number };

function NavList({ badges, email, onNavigate }: { badges: Badges; email: string | null; onNavigate?: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut } = useClerk();
  const { canInstall, showIosHint, install } = useInstallPrompt();

  return (
    <>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <img src={logo} alt="" width={40} height={40} className="rounded-md bg-white p-1" />
        <div className="leading-tight min-w-0">
          <p className="font-display text-base font-semibold">Book Club Admin</p>
          <p className="text-xs opacity-70 truncate">{email ?? "Madina Central"}</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((it) => {
          const p = path.replace(/\/+$/, "") || "/";
          const active = "exact" in it && it.exact ? p === it.to : p.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all ${
                active ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" : "hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4" /> <span className="flex-1">{it.label}</span>
              {"badge" in it && badges[it.badge] > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold flex items-center justify-center">{badges[it.badge]}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-1" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {canInstall && (
          <button onClick={install} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm hover:bg-sidebar-accent transition">
            <Download className="h-4 w-4" /> Install admin app
          </button>
        )}
        {showIosHint && <p className="px-3 py-2 text-xs opacity-70">To install: tap Share, then Add to Home Screen.</p>}
        <a href="/dashboard" className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm hover:bg-sidebar-accent transition">
          <LayoutDashboard className="h-4 w-4 opacity-0" /> Teacher app
        </a>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = "/admin";
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm hover:bg-sidebar-accent transition"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );
}

export function AdminShell({ email, children }: { email: string | null; children: ReactNode }) {
  const s = useStore();
  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    const now = new Date();
    return {
      birthdaysToday: birthdaysInMonth(s.kids, now.getFullYear(), now.getMonth())
        .filter((b) => b.day === now.getDate())
        .map((b) => b.kid.name),
      waitingForAdmin: s.assignments.filter((a) => loanStatus(a) === "pending_admin").length,
      overdue: s.assignments.filter(isOverdue).length,
    };
  }, [s.kids, s.assignments]);

  const members = useQuery(api.members.list);
  const badges: Badges = {
    loans: summary.waitingForAdmin,
    reviews: s.reviews.filter((r) => r.status === "pending").length,
    people: (members ?? []).filter((m) => m.access === "pending").length,
  };
  const totalWaiting = badges.loans + badges.reviews + badges.people;

  // Fires a local notification (once a day) if the admin turned alerts on in Settings.
  useAdminAlerts(s.kids.length || s.assignments.length ? summary : null);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground h-screen sticky top-0">
        <NavList badges={badges} email={email} />
      </aside>
      <main className="flex-1 min-w-0">
        <div
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 pb-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="" width={32} height={32} className="rounded bg-white p-0.5" />
            <p className="font-display text-sm font-semibold truncate">Book Club Admin</p>
          </div>
          <div className="flex items-center gap-1">
            {totalWaiting > 0 && (
              <Link to={badges.people > 0 ? "/admin/people" : badges.loans > 0 ? "/admin/approvals" : "/admin/reviews"} className="min-w-6 h-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold flex items-center justify-center">
                {totalWaiting}
              </Link>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border">
                <div className="flex flex-col h-full">
                  <NavList badges={badges} email={email} onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
