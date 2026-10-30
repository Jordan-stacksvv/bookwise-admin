import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { ArrowLeft, BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { AppFooter } from "@/components/admin/AppFooter";

type Role = "teacher" | "admin";

// Only allow same-site paths like /admin (never //evil.com or full URLs).
const safeRedirect = (v: unknown) => (typeof v === "string" && /^\/(?![/\\])/.test(v) ? v : undefined);

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string; as?: Role } => ({
    redirect: safeRedirect(s.redirect),
    as: s.as === "teacher" || s.as === "admin" ? s.as : undefined,
  }),
  component: LoginPage,
});

const remember = (r: Role) => {
  try {
    localStorage.setItem("bw-role", r);
  } catch {
    /* private mode */
  }
};

// Make the Clerk form match the app instead of looking like a separate box.
const clerkAppearance = {
  variables: {
    colorPrimary: "#1e2a44",
    colorText: "#1a2236",
    colorTextSecondary: "#5b6478",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    fontFamily: '"Inter", system-ui, sans-serif',
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: { width: "100%" },
    card: { boxShadow: "none", border: "none", background: "transparent", padding: 0, width: "100%" },
    cardBox: { boxShadow: "none", border: "none", width: "100%" },
    header: { display: "none" },
    socialButtonsBlockButton: { height: "2.9rem", border: "1px solid #e4dfd2", boxShadow: "none" },
    formFieldInput: { height: "2.9rem", boxShadow: "none" },
    formButtonPrimary: { height: "2.9rem", boxShadow: "none", textTransform: "none", fontSize: "0.9rem" },
    footer: { background: "transparent" },
    footerAction: { display: "none" },
  },
} as const;

function RoleCard({ icon: Icon, title, text, onClick }: { icon: typeof BookOpen; title: string; text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex items-center gap-4 rounded-2xl border bg-card p-4 sm:p-5 transition hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="h-12 w-12 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

function LoginPage() {
  const { redirect, as: role } = Route.useSearch();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const dest = redirect ?? (role === "admin" ? "/admin" : "/dashboard");

  // Signed in and role known: go straight there (full page load, so /admin picks up the admin app manifest).
  useEffect(() => {
    if (isLoaded && isSignedIn && role) window.location.replace(dest);
  }, [isLoaded, isSignedIn, role, dest]);

  const choose = (r: Role) => {
    remember(r);
    navigate({ to: "/login", search: { as: r, redirect } });
  };
  const back = () => navigate({ to: "/login", search: { redirect: undefined, as: undefined } });

  let body: React.ReactNode;
  if (!isLoaded || (isSignedIn && role)) {
    body = <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />;
  } else if (!role) {
    body = (
      <div className="w-full max-w-md space-y-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">{isSignedIn ? `Welcome back${user?.firstName ? ", " + user.firstName : ""}` : "Who are you?"}</h1>
        </div>
        <div className="space-y-3">
          <RoleCard icon={GraduationCap} title="I'm a teacher" text="Books, kids and reviews" onClick={() => choose("teacher")} />
          <RoleCard icon={ShieldCheck} title="I'm an admin" text="Approvals, reports and settings" onClick={() => choose("admin")} />
        </div>
        {isSignedIn && (
          <button className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2" onClick={() => signOut().then(() => window.location.assign("/login"))}>
            Not you? Sign out
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <div className="w-full max-w-md space-y-5">
        <button onClick={back} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Change role
        </button>
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
            {role === "admin" ? <ShieldCheck className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
            {role === "admin" ? "Admin" : "Teacher"}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-3">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in to continue." : "An admin approves new accounts."}
          </p>
        </div>

        {mode === "signin" ? (
          <SignIn routing="hash" forceRedirectUrl={dest} appearance={clerkAppearance} />
        ) : (
          <SignUp routing="hash" forceRedirectUrl={dest} appearance={clerkAppearance} />
        )}

        <p className="text-sm text-muted-foreground text-center">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button className="text-foreground font-medium hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 text-sidebar-foreground" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-3">
          <Logo size={48} alt="SDA logo" className="rounded-lg bg-white/95 p-1.5" />
          <div>
            <p className="font-display text-lg font-semibold">Madina Central</p>
            <p className="text-sm opacity-75">SDA Church Book Club</p>
          </div>
        </div>
        <p className="text-xs opacity-60">© {new Date().getFullYear()} Madina Central SDA Church</p>
      </div>

      <div className="flex flex-col min-h-screen" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="lg:hidden flex items-center gap-3 px-6 pt-6">
          <Logo size={40} alt="SDA" />
          <p className="font-display font-semibold">Madina Central Book Club</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-8">{body}</div>
        <AppFooter />
      </div>
    </div>
  );
}
