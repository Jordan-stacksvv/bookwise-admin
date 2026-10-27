import { useMutation, useQuery } from "convex/react";
import { Check, Trash2, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Empty, Panel, fmtDateTime } from "@/components/admin-app/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/use-admin";
import { friendlyError } from "@/lib/friendly-error";

/** Who can open the admin app. Teachers ask for access from the "Admins only" screen; you approve here. */
export function AdminsPanel() {
  const me = useAdmin();
  const requests = useQuery(api.admins.listRequests) ?? [];
  const admins = useQuery(api.admins.list) ?? [];
  const approve = useMutation(api.admins.approve);
  const decline = useMutation(api.admins.decline);
  const remove = useMutation(api.admins.remove);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      alert(friendlyError(e));
    }
  };

  return (
    <Panel title="Admins">
      <p className="text-xs text-muted-foreground mb-4 max-w-xl">
        Anyone with an account can open the teacher app. To become an admin, they sign in, open <b>Admin area</b> in the footer and tap <b>Request admin access</b>.
        You approve them here.
      </p>

      <p className="text-sm font-medium mb-2">Requests ({requests.length})</p>
      {requests.length === 0 ? (
        <Empty>No pending requests.</Empty>
      ) : (
        <ul className="divide-y mb-4">
          {requests.map((r) => (
            <li key={r._id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
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
      )}

      <p className="text-sm font-medium mb-2">Admins added here ({admins.length})</p>
      {admins.length === 0 ? (
        <Empty>Nobody yet. You are an admin through the server setting.</Empty>
      ) : (
        <ul className="divide-y">
          {admins.map((a) => (
            <li key={a._id} className="py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {a.name ?? "Admin"} {a.userId === (me.status === "admin" ? me.userId : "") && <Badge variant="secondary" className="ml-1">You</Badge>}
                </p>
                <p className="text-xs text-muted-foreground truncate">{a.email ?? a.userId} · added by {a.addedBy}</p>
              </div>
              {a.userId !== (me.status === "admin" ? me.userId : "") && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  aria-label="Remove admin"
                  onClick={() => confirm("Remove this admin?") && run(() => remove({ id: a._id as Id<"admins"> }))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
