import { useClerk, useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { Clock, ShieldOff } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-background gap-6" style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}>
      <div className="flex items-center gap-3">
        <Logo size={44} className="rounded-lg" />
        <div className="leading-tight">
          <p className="font-display font-semibold">Madina Central</p>
          <p className="text-xs text-muted-foreground">SDA Church Book Club</p>
        </div>
      </div>
      <div className="w-full max-w-md bg-card border rounded-2xl p-6 sm:p-8 text-center space-y-4" style={{ boxShadow: "var(--shadow-soft)" }}>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <Button variant="ghost" onClick={async () => { await signOut(); window.location.href = "/login"; }}>
      Sign out
    </Button>
  );
}

/** Shown to someone who has signed in but has not been approved yet. It updates by itself the moment an admin approves. */
export function PendingApproval({ requestedRole }: { requestedRole?: "teacher" | "admin" | null }) {
  const { user } = useUser();
  const first = user?.firstName;
  return (
    <Screen>
      <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
        <Clock className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-semibold">Thanks{first ? `, ${first}` : ""}! You're almost in.</h1>
      <p className="text-sm text-muted-foreground">
        An admin needs to approve your account before you can use the book club{requestedRole === "admin" ? " as an admin" : ""}. You do not need to do anything else.
        This page will take you in as soon as you are approved.
      </p>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Waiting for approval
      </div>
      <SignOutButton />
    </Screen>
  );
}

export function AccessDenied() {
  return (
    <Screen>
      <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
        <ShieldOff className="h-7 w-7" />
      </div>
      <h1 className="font-display text-2xl font-semibold">No access</h1>
      <p className="text-sm text-muted-foreground">An admin has not given this account access to the book club. If you think this is a mistake, please speak to the book club lead.</p>
      <SignOutButton />
    </Screen>
  );
}

/**
 * Wraps the teacher app. Approved teachers and admins see the app; everyone else sees a waiting / no-access screen.
 * Nothing inside <children> runs (no data is requested) until the person is approved.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const access = useQuery(api.access.me);
  const wasWaiting = useRef(false);

  const waiting = access !== undefined && access.status !== "approved" && access.status !== "admin" && access.status !== "denied";
  useEffect(() => {
    if (waiting) wasWaiting.current = true;
    // They asked to be an admin and were just made one: take them to the admin app (full load for its own manifest).
    if (access?.status === "admin" && wasWaiting.current && access.requestedRole === "admin") window.location.replace("/admin");
  }, [waiting, access?.status, access?.requestedRole]);

  if (access === undefined) return <Spinner />;
  if (access.status === "denied") return <AccessDenied />;
  if (access.status === "approved" || access.status === "admin") return <>{children}</>;
  return <PendingApproval requestedRole={access.requestedRole} />;
}
