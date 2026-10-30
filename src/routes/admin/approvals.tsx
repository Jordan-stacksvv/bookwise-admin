import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Empty, fmtDate, fmtDateTime } from "@/components/admin-app/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkBar } from "@/components/admin-app/BulkBar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { friendlyError } from "@/lib/friendly-error";
import { loanStatus, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/approvals")({
  component: Approvals,
});

type Tab = "admin" | "parent" | "history";

function Approvals() {
  const s = useStore();
  const approve = useMutation(api.loans.adminApprove);
  const reject = useMutation(api.loans.adminReject);
  const approveMany = useMutation(api.loans.adminApproveMany);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("admin");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const rows = useMemo(() => {
    const all = s.assignments
      .filter((a) => a.status !== undefined)
      .map((a) => ({ a, kid: s.kids.find((k) => k.id === a.kidId), book: s.books.find((b) => b.id === a.bookId), teacher: s.teachers.find((t) => t.id === a.teacherId), status: loanStatus(a) }))
      .sort((x, y) => +new Date(y.a.assignedAt) - +new Date(x.a.assignedAt));
    return {
      admin: all.filter((r) => r.status === "pending_admin"),
      parent: all.filter((r) => r.status === "pending_parent"),
      history: all.filter((r) => !["pending_admin", "pending_parent"].includes(r.status)).slice(0, 50),
    };
  }, [s.assignments, s.kids, s.books, s.teachers]);

  const doApprove = async (id: string) => {
    setBusyId(id);
    try {
      await approve({ id: id as Id<"assignments"> });
    } catch (e) {
      alert(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  const doDecline = async () => {
    if (!declineId) return;
    setBusyId(declineId);
    try {
      await reject({ id: declineId as Id<"assignments">, reason });
      setDeclineId(null);
      setReason("");
    } catch (e) {
      alert(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };

  const list = rows[tab];
  const chosen = rows.admin.filter((r) => picked.has(r.a.id));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const approveChosen = async () => {
    setBulkBusy(true);
    try {
      await approveMany({ ids: chosen.map((r) => r.a.id as Id<"assignments">) });
      setPicked(new Set());
    } catch (e) {
      alert(friendlyError(e));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Approvals" />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="admin">To approve ({rows.admin.length})</TabsTrigger>
          <TabsTrigger value="parent">Parents ({rows.parent.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "admin" && rows.admin.length > 1 && (
        <BulkBar total={rows.admin.length} selected={chosen.length} busy={bulkBusy} onToggleAll={() => setPicked(chosen.length === rows.admin.length ? new Set() : new Set(rows.admin.map((r) => r.a.id)))} onApprove={approveChosen} />
      )}

      {list.length === 0 ? (
        <div className="bg-card rounded-xl border"><Empty>{tab === "admin" ? "Nothing waiting for you right now." : "Nothing here."}</Empty></div>
      ) : (
        <div className="space-y-3">
          {list.map(({ a, kid, book, teacher, status }) => (
            <div key={a.id} className="bg-card rounded-xl border p-4 space-y-3" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-start gap-3">
                {status === "pending_admin" && rows.admin.length > 1 && <Checkbox className="mt-1" checked={picked.has(a.id)} aria-label="Select this loan" onCheckedChange={() => toggle(a.id)} />}
              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{book?.title ?? "Unknown book"}</p>
                  <p className="text-sm text-muted-foreground">
                    {kid?.name ?? "Unknown kid"} · {kid?.department} · due {fmtDate(a.dueDate)}
                  </p>
                  {teacher && <p className="text-xs text-muted-foreground">Assigned by {teacher.name}</p>}
                </div>
                <StatusBadge status={status} />
              </div>
              </div>

              {a.parentApprovedAt && (
                <p className="text-xs rounded-md bg-muted/60 p-2.5">
                  Parent approved: <b>{a.parentApprovedName ?? "-"}</b> · {fmtDateTime(a.parentApprovedAt)} · policy v{a.policyVersion ?? "?"}
                </p>
              )}
              {a.adminApprovedAt && <p className="text-xs text-muted-foreground">Approved by {a.adminApprovedBy ?? "admin"} · {fmtDateTime(a.adminApprovedAt)}</p>}
              {a.rejectedReason && <p className="text-xs text-destructive">Reason: {a.rejectedReason}</p>}

              {status === "pending_admin" && (
                <div className="flex gap-2">
                  <Button className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busyId === a.id} onClick={() => doApprove(a.id)}>
                    <Check className="h-4 w-4 mr-1.5" /> Approve
                  </Button>
                  <Button variant="outline" className="flex-1 sm:flex-none" disabled={busyId === a.id} onClick={() => setDeclineId(a.id)}>
                    <X className="h-4 w-4 mr-1.5" /> Decline
                  </Button>
                </div>
              )}
              {status === "pending_parent" && (
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeclineId(a.id)}>Decline</Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!declineId} onOpenChange={(o) => !o && setDeclineId(null)}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline this loan?</DialogTitle>
            <DialogDescription>The copy goes back on the shelf.</DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" maxLength={200} />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDeclineId(null)}>Back</Button>
            <Button variant="destructive" disabled={busyId === declineId} onClick={doDecline}>Decline loan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
