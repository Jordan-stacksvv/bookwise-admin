import { useClerk, useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Download, LayoutDashboard, LogOut, MoreVertical, UserCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

/**
 * Pinned at the bottom of the sidebar (teacher and admin apps): photo or initial, name, and a three-dot menu with
 * My profile, Install app, the other app (admins only) and Sign out. Keeps the main links on screen without scrolling.
 */
export function SidebarProfile({ app, onNavigate }: { app: "teacher" | "admin"; onNavigate?: () => void }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { canInstall, showIosHint, install } = useInstallPrompt();

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = user?.fullName || user?.firstName || email || "My account";
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  const handleSignOut = async () => {
    onNavigate?.();
    await signOut();
    if (app === "admin") window.location.href = "/admin";
    else navigate({ to: "/login" });
  };

  return (
    <div className="p-3 border-t border-sidebar-border" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover shrink-0" />
            ) : (
              <span className="h-9 w-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">{initial}</span>
            )}
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-sm font-medium truncate">{name}</span>
              <span className="block text-xs opacity-70 truncate">{app === "admin" ? "Admin" : "Teacher"}</span>
            </span>
            <MoreVertical className="h-4 w-4 opacity-70 shrink-0" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
          <DropdownMenuItem asChild className="py-2.5 cursor-pointer">
            <Link to={app === "admin" ? "/admin/profile" : "/profile"} onClick={onNavigate}>
              <UserCircle className="h-4 w-4 mr-2" /> My profile
            </Link>
          </DropdownMenuItem>
          {canInstall && (
            <DropdownMenuItem onSelect={() => void install()} className="py-2.5 cursor-pointer">
              <Download className="h-4 w-4 mr-2" /> Install {app === "admin" ? "admin " : ""}app
            </DropdownMenuItem>
          )}
          {showIosHint && <p className="px-2 py-2 text-xs text-muted-foreground">Tap Share, then Add to Home Screen.</p>}
          {app === "admin" && (
            <DropdownMenuItem asChild className="py-2.5 cursor-pointer">
              <a href="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" /> Teacher app
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void handleSignOut()} className="py-2.5 cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
