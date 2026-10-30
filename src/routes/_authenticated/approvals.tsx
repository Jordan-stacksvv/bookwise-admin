import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Copy, MessageCircle, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { approvalMessage, approvalUrl, whatsappLink } from "@/lib/approval-link";
import { friendlyError } from "@/lib/friendly-error";
import { loanStatus, useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/_authenticated/approvals")({
  component: ApprovalsPage,
});

type Tab = "parent" | "admin" | "done";

function ApprovalsPage() {
  const s = useStore();
  const policy = useQuery(api.loanPolicy.get);
  const cancel = useMutation(api.loans.cancel);
  const [tab, setTab] = useState<Tab>("parent");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = s.assignments
      .filter((a) => a.status !== undefined) // loans made before approvals existed are not listed
      .map((a) => ({
        a,
        kid: s.kids.find((k) => k.id === a.kidId),
        book: s.books.find((b) => b.id === a.bookId),
        status: loanStatus(a),
      }))
      .sort((x, y) => +new Date(y.a.assignedAt) - +new Date(x.a.assignedAt));
    return {
      parent: all.filter((r) => r.status === "pending_parent"),
      admin: all.filter((r) => r.status === "pending_admin"),
      done: all.filter((r) => !["pending_parent", "pending_admin"].includes(r.status)).slice(0, 30),
    };
  }, [s.assignments, s.kids, s.books]);

  const list = rows[tab];

  const copyLink = async (token: string, id: string) => {
    try {
      await navigator.clipboard.writeText(approvalUrl(token));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("Copy this link:", approvalUrl(token));
    }
  };

  return (
    <>
      <PageHeader title="Loan approvals" />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="parent">Parent ({rows.parent.length})</TabsTrigger>
          <TabsTrigger value="admin">Admin ({rows.admin.length})</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <div className="bg-card rounded-xl border p-8 text-center text-sm text-muted-foreground">Nothing here.</div>
      ) : (
        <div className="space-y-3">
          {list.map(({ a, kid, book, status }) => {
            const msg =
              kid && book && a.approvalToken
                ? approvalMessage({
                    token: a.approvalToken,
                    kidName: kid.name,
                    parentName: kid.parentName,
                    bookTitle: book.title,
                    dueDate: a.dueDate,
                    policyText: policy?.text ?? "",
                    fee: book.price ?? policy?.damageFee ?? 0,
                    currency: policy?.currency ?? "GHS",
                  })
                : null;
            const wa = msg ? whatsappLink(kid?.parentPhone, msg) : null;
            return (
              <div key={a.id} className="bg-card rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ boxShadow: "var(--shadow-soft)" }}>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{book?.title ?? "Unknown book"}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {kid?.name ?? "Unknown kid"} · due {new Date(a.dueDate).toLocaleDateString()}
                  </p>
                  {a.parentApprovedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Parent{a.parentApprovedName ? ` (${a.parentApprovedName})` : ""} approved {new Date(a.parentApprovedAt).toLocaleString()}
                    </p>
                  )}
                  {a.rejectedReason && <p className="text-xs text-destructive mt-1">Reason: {a.rejectedReason}</p>}
                </div>
                <StatusBadge status={status} />
                {status === "pending_parent" && (
                  <div className="flex flex-wrap gap-2">
                    {wa && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => window.open(wa, "_blank")}>
                        <MessageCircle className="h-4 w-4 mr-1.5" /> Send
                      </Button>
                    )}
                    {a.approvalToken && (
                      <Button size="sm" variant="outline" onClick={() => copyLink(a.approvalToken!, a.id)}>
                        <Copy className="h-4 w-4 mr-1.5" /> {copiedId === a.id ? "Copied" : "Link"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm("Cancel this loan request?")) return;
                        try {
                          await cancel({ id: a._id as Id<"assignments"> });
                        } catch (e) {
                          alert(friendlyError(e));
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" /> Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
