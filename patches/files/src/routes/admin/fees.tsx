import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChargeFeeDialog, type ChargeTarget } from "@/components/admin-app/ChargeFeeDialog";
import { Empty, Panel, Stat, fmtDate } from "@/components/admin-app/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { whatsappLink } from "@/lib/approval-link";
import { friendlyError } from "@/lib/friendly-error";
import { loanStatus, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/fees")({
  component: Fees,
});

function Fees() {
  const s = useStore();
  const policy = useQuery(api.loanPolicy.get);
  const setStatus = useMutation(api.loans.setFeeStatus);
  const [pick, setPick] = useState("");
  const [charge, setCharge] = useState<ChargeTarget | null>(null);
  const currency = policy?.currency ?? "GHS";

  const rows = useMemo(
    () =>
      s.assignments
        .filter((a) => a.feeStatus)
        .map((a) => ({ a, kid: s.kids.find((k) => k.id === a.kidId), book: s.books.find((b) => b.id === a.bookId) }))
        .sort((x, y) => +new Date(y.a.feeAt ?? 0) - +new Date(x.a.feeAt ?? 0)),
    [s.assignments, s.kids, s.books],
  );
  const total = (st: string) => rows.filter((r) => r.a.feeStatus === st).reduce((n, r) => n + (r.a.feeAmount ?? 0), 0);

  const chargeable = useMemo(
    () =>
      s.assignments
        .filter((a) => !a.feeStatus && ["approved", undefined].includes(a.status))
        .map((a) => ({ a, kid: s.kids.find((k) => k.id === a.kidId), book: s.books.find((b) => b.id === a.bookId) }))
        .filter((r) => r.kid && r.book)
        .sort((x, y) => +new Date(y.a.assignedAt) - +new Date(x.a.assignedAt))
        .slice(0, 100),
    [s.assignments, s.kids, s.books],
  );

  const startDamage = () => {
    const r = chargeable.find((x) => x.a.id === pick);
    if (!r) return;
    setCharge({ id: r.a.id, kind: "damaged", bookTitle: r.book!.title, kidName: r.kid!.name, defaultFee: r.book!.price ?? policy?.damageFee ?? 0, currency });
  };

  const change = async (id: string, feeStatus: "owed" | "paid" | "waived") => {
    try {
      await setStatus({ id: id as Id<"assignments">, feeStatus });
    } catch (e) {
      alert(friendlyError(e));
    }
  };

  return (
    <>
      <PageHeader title="Fees" subtitle="Lost and damaged books. WhatsApp is still sent by hand." />

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Stat label="Owed" value={`${currency} ${total("owed")}`} tone={total("owed") ? "warn" : "default"} />
        <Stat label="Paid" value={`${currency} ${total("paid")}`} tone="good" />
        <Stat label="Waived" value={`${currency} ${total("waived")}`} />
      </div>

      <Panel title="Charge a damage fee" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 min-w-0">
            <Label className="mb-1.5 block">Choose the loan</Label>
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger><SelectValue placeholder="Kid - book" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {chargeable.map(({ a, kid, book }) => (
                  <SelectItem key={a.id} value={a.id}>{kid!.name} - {book!.title} ({fmtDate(a.assignedAt)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!pick} onClick={startDamage}>Charge fee</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">To mark a book <b>lost</b>, use "Mark lost" on the Overview page (overdue list).</p>
      </Panel>

      <Panel title={`Fee ledger (${rows.length})`}>
        {rows.length === 0 ? (
          <Empty>No fees recorded yet.</Empty>
        ) : (
          <ul className="divide-y">
            {rows.map(({ a, kid, book }) => {
              const msg = `Hello${kid?.parentName ? " " + kid.parentName : ""}, "${book?.title ?? "the book"}" borrowed by ${kid?.name ?? "your child"} was ${a.feeKind === "lost" ? "lost" : "damaged"}. As agreed in the borrowing policy, the replacement cost is ${currency} ${a.feeAmount}. Thank you.`;
              const link = kid?.parentPhone ? whatsappLink(kid.parentPhone, msg) : null;
              return (
                <li key={a.id} className="py-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words">{book?.title ?? "Unknown book"}</p>
                      <p className="text-xs text-muted-foreground">{kid?.name} · {a.feeKind} · {fmtDate(a.feeAt)}{a.feeNote ? ` · ${a.feeNote}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{currency} {a.feeAmount}</p>
                      <Badge variant="secondary" className={a.feeStatus === "paid" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : a.feeStatus === "owed" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : ""}>{a.feeStatus}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.feeStatus !== "paid" && <Button size="sm" variant="outline" onClick={() => change(a.id, "paid")}>Mark paid</Button>}
                    {a.feeStatus === "owed" && <Button size="sm" variant="outline" onClick={() => change(a.id, "waived")}>Waive</Button>}
                    {a.feeStatus !== "owed" && <Button size="sm" variant="ghost" onClick={() => change(a.id, "owed")}>Reopen</Button>}
                    {link && a.feeStatus === "owed" && (
                      <Button size="sm" variant="ghost" onClick={() => window.open(link, "_blank")}><MessageCircle className="h-4 w-4 mr-1.5 text-emerald-500" /> Notify parent</Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <ChargeFeeDialog target={charge} onClose={() => { setCharge(null); setPick(""); }} />
    </>
  );
}
