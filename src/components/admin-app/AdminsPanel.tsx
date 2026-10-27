import { useMutation, useQuery } from "convex/react";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Empty, Panel, fmtDateTime } from "@/components/admin-app/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyError } from "@/lib/friendly-error";

/** Everyone who has signed in. Promote teachers to admin, or remove admins. */
export function AdminsPanel() {
  const members = useQuery(api.members.list);
  const requests = useQuery(api.admins.listRequests) ?? [];
  const makeAdmin = useMutation(api.members.makeAdmin);
  const removeAdmin = useMutation(api.members.removeAdmin);
  const approve = useMutation(api.admins.approve);
  const decline = useMutation(api.admins.decline);
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (members ?? []).filter((m) => !s || (m.name ?? "").toLowerCase().includes(s) || (m.email ?? "").toLowerCase().includes(s));
  }, [members, q]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      alert(friendlyError(e));
    }
  };

  return (
    <Panel title="People & admins">
      <p className="text-xs text-muted-foreground mb-4 max-w-xl">
        Everyone appears here after they sign in once. Tap <b>Make admin</b> to let a teacher open the admin app. People who picked <b>Admin</b> on the login page
        show up under Requests.
      </p>

      {requests.length > 0 && (
        <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="text-sm font-medium mb-2">Requests ({requests.length})</p>
          <ul className="divide-y divide-amber-500/20">
            {requests.map((r) => (
              <li key={r._id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.name ?? "Unknown name"}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email ?? "no email"} · asked {fmtDateTime(r.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => run(() => approve({ id: r._id as Id<"adminRequests"> }))}>
                    <Check className="h-4 w-4 mr-1.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => run(() => decline({ id: r._id as Id<"adminRequests"> }))}>
                    <X className="h-4 w-4 mr-1.5" /> Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="mb-3" />

      {members === undefined ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      ) : shown.length === 0 ? (
        <Empty>{members.length === 0 ? "Nobody has signed in yet." : "No one matches your search."}</Empty>
      ) : (
        <ul className="divide-y">
          {shown.map((m) => (
            <li key={m._id} className="py-3 flex items-center gap-3">
              {m.imageUrl ? (
                <img src={m.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">{(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {m.name ?? "Unknown name"}
                  {m.isYou && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.email ?? m.userId}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="secondary" className={m.isAdmin ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : ""}>{m.isAdmin ? "Admin" : "Teacher"}</Badge>
                  {m.fromServerSetting && <Badge variant="outline">Server setting</Badge>}
                </div>
              </div>
              {!m.isYou && !m.fromServerSetting && (
                m.isAdmin ? (
                  <Button size="sm" variant="outline" onClick={() => confirm(`Remove ${m.name ?? "this person"} as admin?`) && run(() => removeAdmin({ userId: m.userId }))}>Remove admin</Button>
                ) : (
                  <Button size="sm" onClick={() => run(() => makeAdmin({ userId: m.userId }))}>Make admin</Button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
