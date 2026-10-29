import { useMutation } from "convex/react";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BulkBar } from "@/components/admin-app/BulkBar";
import { Panel } from "@/components/admin-app/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { friendlyError } from "@/lib/friendly-error";
import { useStore } from "@/lib/mock-store";

/** Books added by teachers wait here until an admin lets them go live. Shown above the Books list in the admin app. */
export function PendingBooks() {
  const s = useStore();
  const approveMany = useMutation(api.books.approveMany);
  const reject = useMutation(api.books.reject);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const pending = useMemo(() => s.books.filter((b) => b.status === "pending"), [s.books]);
  const chosen = pending.filter((b) => picked.has(b.id));
  if (pending.length === 0) return null;

  const run = async (ids: string[]) => {
    setBusy(true);
    try {
      await approveMany({ ids: ids as Id<"books">[] });
      setPicked(new Set());
    } catch (e) {
      alert(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6">
      <Panel title={`Books waiting for approval (${pending.length})`}>
        <BulkBar
          total={pending.length}
          selected={chosen.length}
          busy={busy}
          onToggleAll={() => setPicked(chosen.length === pending.length ? new Set() : new Set(pending.map((b) => b.id)))}
          onApprove={() => run(chosen.map((b) => b.id))}
        />
        <ul className="divide-y">
          {pending.map((b) => (
            <li key={b.id} className="py-3 flex items-start gap-3">
              <Checkbox className="mt-1" checked={picked.has(b.id)} aria-label={`Select ${b.title}`} onCheckedChange={() => setPicked((p) => { const n = new Set(p); n.has(b.id) ? n.delete(b.id) : n.add(b.id); return n; })} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium break-words">{b.title}</p>
                <p className="text-xs text-muted-foreground">
                  {b.author} · {b.department} · {b.copies} cop{b.copies === 1 ? "y" : "ies"}{b.addedBy ? ` · added by ${b.addedBy}` : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run([b.id])}>Approve</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Decline" disabled={busy} onClick={async () => {
                  const reason = window.prompt("Why is this book declined? (optional)") ;
                  if (reason === null) return;
                  try { await reject({ id: b.id as Id<"books">, reason }); } catch (e) { alert(friendlyError(e)); }
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
