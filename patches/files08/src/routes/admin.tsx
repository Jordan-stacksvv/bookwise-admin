import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { AdminShell } from "@/components/admin-app/AdminShell";
import { AppFooter } from "@/components/admin/AppFooter";
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

  // One login for everyone: signed-out visitors go to the normal login page and come back here.
  useEffect(() => {
    if (admin.status === "signed-out") navigate({ to: "/login", search: { redirect: "/admin" }, replace: true });
  }, [admin.status, navigate]);

  if (admin.status === "loading" || admin.status === "signed-out") return <Spinner />;
  if (admin.status === "not-admin") return <NoAccess userId={admin.userId} />;

  return (
    <AdminShell email={admin.email}>
      <Outlet />
    </AdminShell>
  );
}

function NoAccess({ userId }: { userId: string | null }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const request = useQuery(api.admins.myRequest);
  const ask = useMutation(api.admins.requestAccess);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
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

  const cmd = `npx convex env set ADMIN_USER_IDS "${userId ?? ""}"`;

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
            Request sent. An admin will approve it from Settings. Check back later.
          </p>
        ) : (
          <Button className="w-full" disabled={busy} onClick={send}>{busy ? "Sending..." : "Request admin access"}</Button>
        )}
        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild variant="outline"><a href="/dashboard">Teacher app</a></Button>
          <Button variant="ghost" onClick={async () => { await signOut(); window.location.href = "/login"; }}>Sign out</Button>
        </div>

        <details className="text-xs text-muted-foreground border-t pt-3">
          <summary className="cursor-pointer">I am setting up the very first admin</summary>
          <p className="mt-2">Run this once in the project folder, then reload this page:</p>
          <code className="block mt-2 p-2 rounded bg-muted text-foreground break-all select-all">{cmd}</code>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(cmd);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* select-all above works as a fallback */
              }
            }}
          >
            {copied ? "Copied" : "Copy command"}
          </Button>
          <p className="mt-2">Add <code>--prod</code> for the production deployment.</p>
        </details>
      </div>
      <AppFooter />
    </Centered>
  );
}
