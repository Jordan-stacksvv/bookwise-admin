import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/admin-app/AdminShell";
import { AccessDenied, PendingApproval } from "@/components/admin/AccessGate";
import { AppFooter } from "@/components/admin/AppFooter";
import { MemberSync } from "@/components/admin/MemberSync";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import { friendlyError } from "@/lib/friendly-error";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-background gap-6" style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}>
      <div className="flex items-center gap-3">
        <img src={logo} width={44} height={44} alt="" className="rounded-lg" />
        <div className="leading-tight">
          <p className="font-display font-semibold">Book Club Admin</p>
          <p className="text-xs text-muted-foreground">Madina Central SDA Church</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function AdminLayout() {
  const admin = useAdmin();
  const navigate = useNavigate();

  // Signed-out visitors use the normal login page (as an admin) and come back here.
  useEffect(() => {
    if (admin.status === "signed-out") navigate({ to: "/login", search: { redirect: "/admin", as: "admin" }, replace: true });
  }, [admin.status, navigate]);

  if (admin.status === "loading" || admin.status === "signed-out") return <Spinner />;
  if (admin.status === "not-admin") {
    return (
      <>
        <MemberSync />
        <NotAdmin />
      </>
    );
  }

  return (
    <AdminShell email={admin.email}>
      <MemberSync />
      <Outlet />
    </AdminShell>
  );
}

/** Not an admin: waiting for approval, turned away, or an approved teacher who may ask to become an admin. */
function NotAdmin() {
  const access = useQuery(api.access.me);
  if (access === undefined) return <Spinner />;
  if (access.status === "denied") return <AccessDenied />;
  if (access.status === "approved") return <NoAccess />;
  return <PendingApproval requestedRole="admin" />;
}

function NoAccess() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const request = useQuery(api.admins.myRequest); // undefined = loading, null = none yet
  const ask = useMutation(api.admins.requestAccess);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const auto = useRef(false);
  const email = user?.primaryEmailAddress?.emailAddress;

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await ask({ name: user?.fullName ?? undefined, email });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  // They picked "Admin" on the login page: send the request for them, once.
  useEffect(() => {
    if (request !== null || auto.current || !user) return;
    let picked = "";
    try {
      picked = localStorage.getItem("bw-role") ?? "";
    } catch {
      /* private mode */
    }
    if (picked === "admin") {
      auto.current = true;
      send();
    }
  }, [request, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Centered>
      <div className="w-full max-w-md bg-card border rounded-xl p-6 space-y-4">
        <div className="text-center space-y-2">
          <h1 className="font-display text-xl font-semibold">Admins only</h1>
          <p className="text-sm text-muted-foreground">
            You are signed in{email ? <> as <b>{email}</b></> : ""}, but this account is not an admin yet.
          </p>
        </div>

        {request ? (
          <p className="text-sm rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
            Request sent. An admin will approve it. Check back soon.
          </p>
        ) : (
          <Button className="w-full" disabled={busy || request === undefined} onClick={send}>{busy ? "Sending..." : "Request admin access"}</Button>
        )}
        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild variant="outline"><a href="/dashboard">Go to teacher app</a></Button>
          <Button variant="ghost" onClick={async () => { await signOut(); window.location.href = "/login"; }}>Sign out</Button>
        </div>
      </div>
      <AppFooter />
    </Centered>
  );
}
