import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../../convex/_generated/api";
import { ChargeFeeDialog, type ChargeTarget } from "@/components/admin-app/ChargeFeeDialog";
import { Empty, Panel, Stat, daysBetween, fmtDate } from "@/components/admin-app/ui";
import { BirthdayCard } from "@/components/admin/BirthdayCard";
import { NeedsAttention } from "@/components/admin-app/NeedsAttention";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { whatsappLink } from "@/lib/approval-link";
import { availableCopies, isOverdue, loanStatus, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/")({
  component: Overview,
});

type Range = "30" | "90" | "all";
const RANGES: { v: Range; label: string }[] = [
  { v: "30", label: "30 days" },
  { v: "90", label: "90 days" },
  { v: "all", label: "All time" },
];

function Overview() {
  const s = useStore();
  const policy = useQuery(api.loanPolicy.get);
  const [range, setRange] = useState<Range>("all");
  const [charge, setCharge] = useState<ChargeTarget | null>(null);

  const d = useMemo(() => {
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
    // a loan "counts" as read once it was actually handed over (not pending / declined / cancelled)
    const counted = s.assignments.filter((a) => ["approved", "lost"].includes(loanStatus(a)) && +new Date(a.assignedAt) >= cutoff);

    const byBook = new Map<string, number>();
    const byClass = new Map<string, number>();
    const byKid = new Map<string, number>();
    for (const a of counted) {
      byBook.set(a.bookId, (byBook.get(a.bookId) ?? 0) + 1);
      byKid.set(a.kidId, (byKid.get(a.kidId) ?? 0) + 1);
      const kid = s.kids.find((k) => k.id === a.kidId);
      if (kid) byClass.set(kid.department, (byClass.get(kid.department) ?? 0) + 1);
    }
    const title = (id: string) => s.books.find((b) => b.id === id)?.title ?? "Unknown";
    const short = (t: string) => (t.length > 22 ? t.slice(0, 21) + "…" : t);

    const mostRead = [...byBook.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => ({ name: short(title(id)), full: title(id), n }));
    const topReaders = [...byKid.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => ({ name: s.kids.find((k) => k.id === id)?.name ?? "Unknown", n }));
    const classes = [...byClass.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));
    const everBorrowed = new Set(s.assignments.filter((a) => ["approved", "lost"].includes(loanStatus(a))).map((a) => a.bookId));
    const neverRead = s.books.filter((b) => !everBorrowed.has(b.id));
    const noCopies = s.books.filter((b) => availableCopies(b, s.assignments) === 0);
    const withIssues = s.books.filter((b) => b.issues.length > 0);

    const now = new Date();
    const overdue = s.assignments
      .filter(isOverdue)
      .map((a) => ({
        a,
        kid: s.kids.find((k) => k.id === a.kidId),
        book: s.books.find((b) => b.id === a.bookId),
        days: daysBetween(new Date(a.dueDate), now),
      }))
      .sort((x, y) => y.days - x.days);

    return {
      out: s.assignments.filter((a) => !a.returnedAt && loanStatus(a) === "approved").length,
      waitingAdmin: s.assignments.filter((a) => loanStatus(a) === "pending_admin").length,
      waitingParent: s.assignments.filter((a) => loanStatus(a) === "pending_parent").length,
      mostRead, topReaders, classes, neverRead, noCopies, withIssues, overdue,
      loansInRange: counted.length,
    };
  }, [s.assignments, s.books, s.kids, range]);

  const currency = policy?.currency ?? "GHS";
  const fee = (bookId: string) => s.books.find((b) => b.id === bookId)?.price ?? policy?.damageFee ?? 0;

  const remind = (kidName: string, parentName: string | undefined, phone: string | undefined, bookTitle: string, due: string) => {
    const msg = `Hello${parentName ? " " + parentName : ""}, ${kidName} still has "${bookTitle}" from the Madina Central SDA Book Club (it was due ${fmtDate(due)}). Please help ${kidName} return it this week. Thank you!`;
    const link = whatsappLink(phone, msg);
    if (link) window.open(link, "_blank");
  };

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <div className="inline-flex rounded-lg border bg-card p-1">
            {RANGES.map((r) => (
              <button
                key={r.v}
                onClick={() => setRange(r.v)}
                className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition ${range === r.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat label="Books out now" value={d.out} />
        <Stat label="Overdue / missing" value={d.overdue.length} tone={d.overdue.length ? "bad" : "good"} />
        <Stat label="Waiting for you" value={d.waitingAdmin} tone={d.waitingAdmin ? "warn" : "default"} hint={`${d.waitingParent} waiting for parents`} />
        <Stat label={`Loans (${RANGES.find((r) => r.v === range)!.label.toLowerCase()})`} value={d.loansInRange} hint={`${s.books.length} titles in the library`} />
      </div>

      <NeedsAttention loans={d.waitingAdmin} />

      <BirthdayCard kids={s.kids} />

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <Panel title="Most read books">
          {d.mostRead.length === 0 ? (
            <Empty>No loans in this period yet.</Empty>
          ) : (
            <div className="h-72 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.mostRead} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} strokeOpacity={0.15} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={118} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, "Loans"]} labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""} />
                  <Bar dataKey="n" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Reading by class">
          {d.classes.length === 0 ? (
            <Empty>No loans in this period yet.</Empty>
          ) : (
            <div className="h-72 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.classes} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid vertical={false} strokeOpacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip formatter={(v) => [v, "Loans"]} />
                  <Bar dataKey="n" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {d.topReaders.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Top readers</p>
              <ul className="text-sm space-y-1">
                {d.topReaders.map((r) => (
                  <li key={r.name} className="flex justify-between gap-3"><span className="truncate">{r.name}</span><span className="text-muted-foreground">{r.n}</span></li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <Panel title={`Overdue / missing (${d.overdue.length})`} className="mb-6">
        {d.overdue.length === 0 ? (
          <Empty>Nothing overdue.</Empty>
        ) : (
          <ul className="divide-y">
            {d.overdue.slice(0, 25).map(({ a, kid, book, days }) => {
              const can = !!(kid?.parentPhone && whatsappLink(kid.parentPhone, "x"));
              return (
                <li key={a.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{book?.title ?? "Unknown book"}</p>
                    <p className="text-xs text-muted-foreground truncate">{kid?.name ?? "Unknown kid"} · {kid?.department} · due {fmtDate(a.dueDate)}</p>
                  </div>
                  <span className={`text-xs font-medium ${days > 14 ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}>{days} day{days === 1 ? "" : "s"} late</span>
                  <div className="flex gap-2">
                    {can && (
                      <Button size="sm" variant="outline" onClick={() => remind(kid!.name, kid!.parentName, kid!.parentPhone, book?.title ?? "the book", a.dueDate)}>
                        <MessageCircle className="h-4 w-4 mr-1.5 text-emerald-500" /> Remind
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setCharge({ id: a.id, kind: "lost", bookTitle: book?.title ?? "Book", kidName: kid?.name ?? "Kid", defaultFee: fee(a.bookId), currency })}
                    >
                      Mark lost
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel title={`Never borrowed (${d.neverRead.length})`}>
          {d.neverRead.length === 0 ? <Empty>Every title has been borrowed.</Empty> : <MiniList items={d.neverRead.map((b) => b.title)} />}
        </Panel>
        <Panel title={`No copies on the shelf (${d.noCopies.length})`}>
          {d.noCopies.length === 0 ? <Empty>All books have a copy available.</Empty> : <MiniList items={d.noCopies.map((b) => b.title)} />}
        </Panel>
        <Panel title={`Issues reported (${d.withIssues.length})`}>
          {d.withIssues.length === 0 ? <Empty>No issues reported.</Empty> : <MiniList items={d.withIssues.map((b) => `${b.title} (${b.issues.length})`)} />}
        </Panel>
      </div>

      <ChargeFeeDialog target={charge} onClose={() => setCharge(null)} />
    </>
  );
}

function MiniList({ items }: { items: string[] }) {
  return (
    <ul className="text-sm space-y-1.5 max-h-56 overflow-y-auto pr-1">
      {items.slice(0, 40).map((t, i) => (
        <li key={i} className="truncate">{t}</li>
      ))}
      {items.length > 40 && <li className="text-xs text-muted-foreground">+{items.length - 40} more</li>}
    </ul>
  );
}
