import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/friendly-error";

export const Route = createFileRoute("/approve/$token")({
  component: ApprovePage,
});

/** PUBLIC page (no login). The parent reads the policy and taps Approve. */
function ApprovePage() {
  const { token } = Route.useParams();
  const loan = useQuery(api.loans.byToken, { token });
  const approve = useMutation(api.loans.parentApprove);
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-10" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center gap-3 mb-5">
          <img src={logo} width={40} height={40} alt="" className="rounded-md" />
          <div className="leading-tight">
            <p className="font-display font-semibold">Madina Central</p>
            <p className="text-xs text-muted-foreground">SDA Book Club</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (loan === undefined) {
    return shell(
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>,
    );
  }

  if (loan === null) {
    return shell(
      <div className="bg-card border rounded-xl p-6 text-center">
        <h1 className="font-display text-xl font-semibold">Link not valid</h1>
        <p className="text-sm text-muted-foreground mt-2">This approval link is wrong or has expired. Please ask the teacher to send it again.</p>
      </div>,
    );
  }

  const alreadyDone = done || ["pending_admin", "approved", "lost"].includes(loan.status);
  if (alreadyDone) {
    return shell(
      <div className="bg-card border rounded-xl p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
        <h1 className="font-display text-xl font-semibold mt-3">Thank you!</h1>
        <p className="text-sm text-muted-foreground mt-2">
          You have approved <b>{loan.kidName}</b> borrowing <b>"{loan.bookTitle}"</b>. The book club admin will give final approval and the teacher will
          hand over the book.
        </p>
      </div>,
    );
  }

  if (loan.status !== "pending_parent" || loan.ended) {
    return shell(
      <div className="bg-card border rounded-xl p-6 text-center">
        <h1 className="font-display text-xl font-semibold">This request is closed</h1>
        <p className="text-sm text-muted-foreground mt-2">It was cancelled or declined. Please speak to the teacher if you have questions.</p>
      </div>,
    );
  }

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      await approve({ token, parentName: name, policyVersion: loan.policy.version });
      setDone(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return shell(
    <div className="bg-card border rounded-xl p-5 sm:p-6 space-y-5" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-semibold">Approve book loan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loan.parentName ? `Hello ${loan.parentName}. ` : ""}Please review and approve.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-3">
        <BookOpen className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-medium break-words">{loan.bookTitle}</p>
          <p className="text-sm text-muted-foreground break-words">{loan.author}</p>
          <p className="text-sm mt-1">
            For <b>{loan.kidName}</b> · due {new Date(loan.dueDate).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">Borrowing policy</h2>
        <div className="max-h-64 overflow-y-auto rounded-lg border p-3 text-sm whitespace-pre-wrap break-words">{loan.policy.text}</div>
        <p className="text-sm mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          If this book is lost or damaged, the replacement cost is <b>{loan.policy.currency} {loan.policy.fee}</b>.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pname">Your full name</Label>
        <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Parent / guardian name" autoComplete="name" maxLength={80} />
      </div>

      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <Checkbox checked={agree} onCheckedChange={(c) => setAgree(c === true)} className="mt-0.5" />
        <span>I have read the policy above and I approve this loan.</span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full h-11" disabled={busy || !agree || name.trim().length < 2} onClick={submit}>
        {busy ? "Saving..." : "Approve"}
      </Button>
    </div>,
  );
}
