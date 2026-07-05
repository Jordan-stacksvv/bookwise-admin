import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, BookOpen, Users, CalendarDays, LogOut, GraduationCap, Menu, Building2 } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import logo from "@/assets/logo.png";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/books", label: "Books", icon: BookOpen },
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/kids", label: "Kids", icon: Users },
  { to: "/teachers", label: "Teachers", icon: GraduationCap },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
    onNavigate?.();
  };

  return (
    <>
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <img src={logo} alt="SDA" width={40} height={40} className="rounded-md bg-white p-1" />
        <div className="leading-tight">
          <p className="font-display text-base font-semibold">Madina Central</p>
          <p className="text-xs opacity-70">SDA Book Club</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = path.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                  : "hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4" /> {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent transition"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground min-h-screen sticky top-0">
      <NavList />
    </aside>
  );
}

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
      <div className="flex items-center gap-2">
        <img src={logo} alt="SDA" width={32} height={32} className="rounded bg-white p-0.5" />
        <p className="font-display text-sm font-semibold">Madina Central</p>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border">
          <div className="flex flex-col h-full">
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

