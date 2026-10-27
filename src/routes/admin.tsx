import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SignIn, useClerk } from "@clerk/clerk-react";
import { AdminShell } from "@/components/admin-app/AdminShell";
import { AppFooter } from "@/components/admin/AppFooter";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
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

function AdminLayout() {
  const admin = useAdmin();
  const { signOut } = useClerk();

  if (admin.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (admin.status === "signed-out") {
    return (
      <Centered>
        <SignIn
          routing="hash"
          forceRedirectUrl="/admin"
          appearance={{ elements: { rootBox: "w-full max-w-md", card: "shadow-none border border-border rounded-xl p-6", footerAction: "hidden" } }}
        />
        <AppFooter />
      </Centered>
    );
  }

  if (admin.status === "not-admin") {
    return (
      <Centered>
        <div className="w-full max-w-md bg-card border rounded-xl p-6 text-center space-y-3">
          <h1 className="font-display text-xl font-semibold">Admins only</h1>
          <p className="text-sm text-muted-foreground">
            {admin.email ? <>You are signed in as <b>{admin.email}</b>, which is not an admin.</> : "Your account is not an admin."} Ask the book club lead to add
            you.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button asChild><a href="/dashboard">Go to teacher app</a></Button>
            <Button variant="outline" onClick={async () => { await signOut(); window.location.href = "/admin"; }}>Sign out</Button>
          </div>
        </div>
      </Centered>
    );
  }

  return (
    <AdminShell email={admin.email}>
      <Outlet />
    </AdminShell>
  );
}
