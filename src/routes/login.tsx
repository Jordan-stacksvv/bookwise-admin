import { createFileRoute } from "@tanstack/react-router";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 text-sidebar-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-3">
          <img
            src={logo}
            width={48}
            height={48}
            className="rounded-lg bg-white/95 p-1.5"
            alt="SDA logo"
          />
          <div>
            <p className="font-display text-lg font-semibold">Madina Central</p>
            <p className="text-sm opacity-75">SDA Church Book Club</p>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="font-display text-4xl leading-tight">
            Nurturing young minds, one chapter at a time.
          </h2>
          <p className="opacity-80 text-sm leading-relaxed">
            Track every book, every reader, and every return — all from one
            elegant admin panel built for the church library.
          </p>
        </div>
        <p className="text-xs opacity-60">
          © {new Date().getFullYear()} Madina Central SDA Church
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-col items-center justify-center p-8 gap-6">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-2">
          <img src={logo} width={40} height={40} alt="SDA" />
          <p className="font-display font-semibold">Madina Central Book Club</p>
        </div>

        {mode === "signin" ? (
          <SignIn
            routing="hash"
            afterSignInUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full max-w-md",
                card: "shadow-none border border-border rounded-xl p-6",
              },
            }}
          />
        ) : (
          <SignUp
            routing="hash"
            afterSignUpUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full max-w-md",
                card: "shadow-none border border-border rounded-xl p-6",
              },
            }}
          />
        )}

        <p className="text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            className="text-foreground font-medium hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
