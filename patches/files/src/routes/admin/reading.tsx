import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Empty, Panel, fmtDate } from "@/components/admin-app/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { friendlyError } from "@/lib/friendly-error";
import { loanStatus, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/reading")({
  component: ClassReading,
});

function ClassReading() {
  const s = useStore();
  const sets = useQuery(api.readingSets.list) ?? [];
  const create = useMutation(api.readingSets.create);
  const remove = useMutation(api.readingSets.remove);
  const [dept, setDept] = useState("");
  const [bookId, setBookId] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const books = useMemo(() => [...s.books].sort((a, b) => a.title.localeCompare(b.title)), [s.books]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof sets>();
    for (const r of sets) m.set(r.department, [...(m.get(r.department) ?? []), r]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [sets]);

  /** How many kids in the class have been handed this book (any time). */
  const progress = (department: string, bId: string) => {
    const kids = s.kids.filter((k) => k.department === department);
    const started = new Set(
      s.assignments.filter((a) => a.bookId === bId && ["approved", "lost"].includes(loanStatus(a)) && kids.some((k) => k.id === a.kidId)).map((a) => a.kidId),
    );
    return { started: started.size, total: kids.length };
  };

  const add = async () => {
    setError("");
    setBusy(true);
    try {
      await create({ bookId: bookId as Id<"books">, department: dept, dueDate: due ? new Date(due + "T23:59:59").toISOString() : undefined, note });
      setBookId("");
      setDue("");
      setNote("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Class reading" subtitle="Set a book for a whole class to read. Teachers see it on their dashboard." />

      <Panel title="Set a book for a class" className="mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Class</Label>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
              <SelectContent>{s.departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Book</Label>
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger><SelectValue placeholder="Choose a book" /></SelectTrigger>
              <SelectContent className="max-h-72">{books.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Finish by (optional)</Label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Note for teachers (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Read chapters 1-5 first" />
          </div>
        </div>
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        <Button className="mt-4 w-full sm:w-auto" disabled={busy || !dept || !bookId} onClick={add}>{busy ? "Saving..." : "Set for class"}</Button>
      </Panel>

      {grouped.length === 0 ? (
        <div className="bg-card rounded-xl border"><Empty>No class reading set yet.</Empty></div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([department, items]) => (
            <Panel key={department} title={department}>
              <ul className="divide-y">
                {items.map((r) => {
                  const book = s.books.find((b) => b.id === r.bookId);
                  const p = progress(r.department, r.bookId);
                  return (
                    <li key={r._id} className="py-3 flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium break-words">{book?.title ?? "Book removed"}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.dueDate ? `Finish by ${fmtDate(r.dueDate)} · ` : ""}{p.started} of {p.total} kids have borrowed it
                        </p>
                        {r.note && <p className="text-sm mt-1 break-words">{r.note}</p>}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive shrink-0"
                        aria-label="Remove"
                        onClick={async () => {
                          if (!confirm("Remove this from the class?")) return;
                          try {
                            await remove({ id: r._id as Id<"readingSets"> });
                          } catch (e) {
                            alert(friendlyError(e));
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
