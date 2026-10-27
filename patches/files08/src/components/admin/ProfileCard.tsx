import { useClerk, useUser } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { Camera, Download, LogOut, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/hooks/use-admin";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

/** My account: name, photo, role, switch app, install, sign out. Used by both the teacher and admin apps. */
export function ProfileCard({ app }: { app: "teacher" | "admin" }) {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const admin = useAdmin();
  const { canInstall, showIosHint, install } = useInstallPrompt();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirst(user.firstName ?? "");
      setLast(user.lastName ?? "");
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isLoaded || !user) return <div className="h-24 animate-pulse rounded-xl bg-muted" />;

  const isAdmin = admin.status === "admin";
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const dirty = first.trim() !== (user.firstName ?? "") || last.trim() !== (user.lastName ?? "");

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await user.update({ firstName: first.trim(), lastName: last.trim() });
      setMsg("Saved.");
    } catch {
      setMsg("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onPhoto = async (f?: File) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setMsg("Photo is too big (5 MB max).");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await user.setProfileImage({ file: f });
      setMsg("Photo updated.");
    } catch {
      setMsg("Could not upload the photo.");
    } finally {
      setBusy(false);
    }
  };

  const switchLink =
    app === "teacher" ? (
      isAdmin && (
        <Button asChild variant="outline" className="justify-start">
          <a href="/admin"><ShieldCheck className="h-4 w-4 mr-2" /> Open the admin app</a>
        </Button>
      )
    ) : (
      <Button asChild variant="outline" className="justify-start">
        <a href="/dashboard">Open the teacher app</a>
      </Button>
    );

  return (
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">
      <section className="bg-card rounded-xl border p-4 sm:p-6 space-y-5" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <img src={user.imageUrl} alt="" className="h-20 w-20 rounded-full object-cover border" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              aria-label="Change photo"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold truncate">{user.fullName || email || "Your account"}</p>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
            <Badge variant="secondary" className={`mt-1.5 ${isAdmin ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : ""}`}>
              {admin.status === "loading" ? "…" : isAdmin ? "Admin" : "Teacher"}
            </Badge>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block">First name</Label>
            <Input value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} autoComplete="given-name" />
          </div>
          <div>
            <Label className="mb-1.5 block">Last name</Label>
            <Input value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} autoComplete="family-name" />
          </div>
        </div>
        {msg && <p className="text-sm">{msg}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button disabled={busy || !dirty} onClick={save}>Save changes</Button>
          <Button variant="outline" onClick={() => openUserProfile()}>Change email or password</Button>
        </div>
      </section>

      <section className="bg-card rounded-xl border p-4 sm:p-6 space-y-3 h-fit" style={{ boxShadow: "var(--shadow-soft)" }}>
        <h2 className="font-display text-lg font-semibold">This device</h2>
        {switchLink}
        {app === "admin" && (
          <Button asChild variant="outline" className="justify-start">
            <Link to="/admin/settings">Policy, fees and alerts</Link>
          </Button>
        )}
        {canInstall && (
          <Button variant="outline" className="justify-start" onClick={install}>
            <Download className="h-4 w-4 mr-2" /> Install {app === "admin" ? "admin " : ""}app
          </Button>
        )}
        {showIosHint && <p className="text-xs text-muted-foreground">To install: tap Share, then Add to Home Screen.</p>}
        <Button
          variant="ghost"
          className="justify-start text-destructive hover:text-destructive"
          onClick={async () => {
            await signOut();
            window.location.href = app === "admin" ? "/admin" : "/login";
          }}
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </section>
    </div>
  );
}
