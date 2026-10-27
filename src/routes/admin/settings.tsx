import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AdminsPanel } from "@/components/admin-app/AdminsPanel";
import { Panel, fmtDateTime } from "@/components/admin-app/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdmin } from "@/hooks/use-admin";
import { useAdminAlerts } from "@/hooks/use-admin-alerts";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import { friendlyError } from "@/lib/friendly-error";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Policy text, damage fee and admin app options." />
      <div className="space-y-6">
        <PolicyPanel />
        <PricesPanel />
        <AppPanel />
        <AdminsPanel />
      </div>
    </>
  );
}

function PolicyPanel() {
  const policy = useQuery(api.loanPolicy.get);
  const save = useMutation(api.loanPolicy.save);
  const [text, setText] = useState("");
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("GHS");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (policy) {
      setText(policy.text);
      setFee(String(policy.damageFee));
      setCurrency(policy.currency);
    }
  }, [policy?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!policy && (text !== policy.text || Number(fee) !== policy.damageFee || currency.toUpperCase() !== policy.currency);

  const submit = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await save({ text, damageFee: Number(fee), currency });
      setMsg(`Saved. Policy version ${r.version}.`);
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Borrowing policy & damage fee">
      <div className="space-y-4">
        <div>
          <Label className="mb-1.5 block">Policy text (parents read this before approving)</Label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} maxLength={4000} />
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <Label className="mb-1.5 block">Default damage fee</Label>
            <Input type="number" inputMode="decimal" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Currency</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={5} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          This is the amount charged for a lost or damaged book unless that book has its own price below. Changing the text or fee creates a new policy version;
          each approval records the version the parent saw.{policy?.updatedAt ? ` Last changed ${fmtDateTime(policy.updatedAt)} (v${policy.version}).` : ` Showing the starter policy (v${policy?.version ?? 1}) - edit and save it.`}
        </p>
        {msg && <p className="text-sm">{msg}</p>}
        <Button className="w-full sm:w-auto" disabled={busy || !dirty} onClick={submit}>{busy ? "Saving..." : "Save policy"}</Button>
      </div>
    </Panel>
  );
}

function PricesPanel() {
  const s = useStore();
  const policy = useQuery(api.loanPolicy.get);
  const setPrice = useMutation(api.loanPolicy.setBookPrice);
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  const books = useMemo(
    () => [...s.books].filter((b) => b.title.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.title.localeCompare(b.title)).slice(0, 40),
    [s.books, q],
  );

  const commit = async (id: string, current?: number) => {
    const raw = edits[id];
    if (raw === undefined) return;
    const value = raw.trim() === "" ? undefined : Number(raw);
    if (value !== undefined && !Number.isFinite(value)) return;
    if (value === current) {
      setEdits(({ [id]: _, ...rest }) => rest);
      return;
    }
    try {
      setErr("");
      await setPrice({ bookId: id as Id<"books">, price: value });
      setEdits(({ [id]: _, ...rest }) => rest);
    } catch (e) {
      setErr(friendlyError(e));
    }
  };

  return (
    <Panel title="Book prices (optional)">
      <p className="text-sm text-muted-foreground mb-3">
        Give a book its own replacement cost. Leave it empty to use the default fee ({policy?.currency ?? "GHS"} {policy?.damageFee ?? 0}).
      </p>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books…" className="mb-3" />
      {err && <p className="text-sm text-destructive mb-2">{err}</p>}
      <ul className="divide-y max-h-96 overflow-y-auto">
        {books.map((b) => (
          <li key={b.id} className="py-2.5 flex items-center gap-3">
            <p className="text-sm min-w-0 flex-1 truncate">{b.title}</p>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              className="w-28 shrink-0"
              placeholder={String(policy?.damageFee ?? "")}
              value={edits[b.id] ?? (b.price !== undefined ? String(b.price) : "")}
              onChange={(e) => setEdits((m) => ({ ...m, [b.id]: e.target.value }))}
              onBlur={() => commit(b.id, b.price)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </li>
        ))}
      </ul>
      {s.books.length > 40 && <p className="text-xs text-muted-foreground mt-2">Showing 40 - use search to find the rest.</p>}
    </Panel>
  );
}

function AppPanel() {
  const alerts = useAdminAlerts(null);
  const { canInstall, showIosHint, install } = useInstallPrompt();
  return (
    <Panel title="This app">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Daily alerts</p>
            <p className="text-xs text-muted-foreground max-w-md">
              When you open the admin app, get a notification about today's birthdays, loans waiting for you and overdue books (once a day). It does not run while the
              app is closed.
            </p>
          </div>
          {alerts.supported ? (
            <Switch checked={alerts.enabled} onCheckedChange={(on) => (on ? alerts.enable() : alerts.disable())} />
          ) : (
            <span className="text-xs text-muted-foreground">Not supported here</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <div>
            <p className="text-sm font-medium">Install on this device</p>
            <p className="text-xs text-muted-foreground">
              {showIosHint ? "On iPhone/iPad: tap Share, then Add to Home Screen." : canInstall ? "Adds the admin app to your home screen or desktop." : "Already installed, or your browser has not offered it yet."}
            </p>
          </div>
          {canInstall && <Button size="sm" onClick={install}>Install</Button>}
        </div>
      </div>
    </Panel>
  );
}

function AccessPanel() {
  const admin = useAdmin();
  const email = admin.status === "admin" ? admin.email : null;
  return (
    <Panel title="Who is an admin">
      <p className="text-sm">
        You are signed in as <b>{email ?? "unknown"}</b>.
      </p>
      <p className="text-xs text-muted-foreground mt-2 max-w-xl">
        Admins are set on the server, not in this app. Add emails (comma separated) with the Convex env var <code>ADMIN_EMAILS</code>, for example{" "}
        <code>npx convex env set ADMIN_EMAILS "you@example.com,second@example.com"</code> (add <code>--prod</code> for the production deployment).
      </p>
    </Panel>
  );
}
