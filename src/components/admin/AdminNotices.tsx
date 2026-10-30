import { useQuery } from "convex/react";
import { BookMarked, Megaphone } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/mock-store";

/** Dashboard card for teachers: announcements and books the admin set for classes to read. */
export function AdminNotices() {
  const s = useStore();
  const announcements = useQuery(api.announcements.list) ?? [];
  const sets = useQuery(api.readingSets.list) ?? [];
  const [filter, setFilter] = useState<string>("all");

  const nowIso = new Date().toISOString();
  const live = announcements.filter((a) => (!a.expiresAt || a.expiresAt >= nowIso) && (filter === "all" || a.audience.length === 0 || a.audience.includes(filter)));
  const reading = sets.filter((r) => filter === "all" || r.department === filter);

  if (announcements.length === 0 && sets.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border p-4 sm:p-6 mb-6" style={{ boxShadow: "var(--shadow-soft)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-accent-foreground" /> From the admin
        </h3>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {["all", ...s.departments].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs border transition ${filter === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
            >
              {c === "all" ? "All classes" : c}
            </button>
          ))}
        </div>
      </div>

      {live.length > 0 && (
        <ul className="space-y-3">
          {live.slice(0, 4).map((a) => (
            <li key={a._id} className="rounded-lg border p-3">
              <p className="text-sm font-medium break-words">{a.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words mt-0.5">{a.body}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {a.audience.length === 0 ? <Badge variant="outline">Everyone</Badge> : a.audience.map((c: string) => <Badge key={c} variant="outline">{c}</Badge>)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {reading.length > 0 && (
        <div className={live.length > 0 ? "mt-4 pt-4 border-t" : ""}>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><BookMarked className="h-3.5 w-3.5" /> Set for classes to read</p>
          <ul className="space-y-2">
            {reading.map((r) => {
              const book = s.books.find((b) => b.id === r.bookId);
              return (
                <li key={r._id} className="text-sm flex flex-wrap items-baseline gap-x-2">
                  <Badge variant="secondary">{r.department}</Badge>
                  <span className="font-medium break-words">{book?.title ?? "Book removed"}</span>
                  {r.dueDate && <span className="text-xs text-muted-foreground">by {new Date(r.dueDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>}
                  {r.note && <span className="text-xs text-muted-foreground w-full">{r.note}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {live.length === 0 && reading.length === 0 && <p className="text-sm text-muted-foreground">Nothing for this class right now.</p>}
    </div>
  );
}
