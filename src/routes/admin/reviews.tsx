import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Empty, fmtDate } from "@/components/admin-app/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkBar } from "@/components/admin-app/BulkBar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { friendlyError } from "@/lib/friendly-error";
import { useStore } from "@/lib/mock-store";
import { reviewShareText, reviewUrl, shortName, whatsappText } from "@/lib/review-share";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

type Tab = "pending" | "approved" | "rejected";

function AdminReviews() {
  const s = useStore();
  const approve = useMutation(api.reviews.approve);
  const reject = useMutation(api.reviews.reject);
  const approveMany = useMutation(api.reviews.approveMany);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = s.reviews
      .filter((r) => r.status)
      .map((r) => ({ r, kid: s.kids.find((k) => k.id === r.kidId), book: s.books.find((b) => b.id === r.bookId) }))
      .sort((a, b) => +new Date(b.r.submittedAt ?? b.r.createdAt) - +new Date(a.r.submittedAt ?? a.r.createdAt));
    return {
      pending: all.filter((x) => x.r.status === "pending"),
      approved: all.filter((x) => x.r.status === "approved"),
      rejected: all.filter((x) => x.r.status === "rejected"),
    };
  }, [s.reviews, s.kids, s.books]);

  const guard = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
    } catch (e) {
      alert(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async (token: string, id: string) => {
    try {
      await navigator.clipboard.writeText(reviewUrl(token));
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this link:", reviewUrl(token));
    }
  };

  const list = rows[tab];
  const chosen = rows.pending.filter((x) => picked.has(x.r.id));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const approveChosen = async () => {
    setBulkBusy(true);
    try {
      await approveMany({ ids: chosen.map((x) => x.r._id as Id<"bookReviews">) });
      setPicked(new Set());
    } catch (e) {
      alert(friendlyError(e));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Reviews" />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="pending">To approve ({rows.pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Published ({rows.approved.length})</TabsTrigger>
          <TabsTrigger value="rejected">Declined</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "pending" && rows.pending.length > 1 && (
        <BulkBar total={rows.pending.length} selected={chosen.length} busy={bulkBusy} label="Publish selected" onToggleAll={() => setPicked(chosen.length === rows.pending.length ? new Set() : new Set(rows.pending.map((x) => x.r.id)))} onApprove={approveChosen} />
      )}

      {list.length === 0 ? (
        <div className="bg-card rounded-xl border"><Empty>{tab === "pending" ? "No reviews waiting for you." : "Nothing here."}</Empty></div>
      ) : (
        <div className="space-y-3">
          {list.map(({ r, kid, book }) => (
            <article key={r.id} className="bg-card rounded-xl border p-4 space-y-3" style={{ boxShadow: "var(--shadow-soft)" }}>
              <div className="flex items-start gap-3">
                {tab === "pending" && rows.pending.length > 1 && <Checkbox className="mt-1" checked={picked.has(r.id)} aria-label="Select this review" onCheckedChange={() => toggle(r.id)} />}
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold break-words">{book?.title ?? "Unknown book"}</p>
                <p className="text-xs text-muted-foreground">
                  {kid?.name ?? "Unknown kid"} · {kid?.department} · {fmtDate(r.submittedAt ?? r.createdAt)}
                  {r.chapterRange ? ` · Chapters ${r.chapterRange}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">Public name: <b>{kid ? shortName(kid.name) : "-"}</b> (first name and last initial only)</p>
              </div>
              </div>
              {r.imageUrl && (
                <a href={r.imageUrl} target="_blank" rel="noreferrer">
                  <img src={r.imageUrl} alt="Photo of the review" loading="lazy" className="w-full max-h-72 object-contain rounded-lg border bg-muted/40" />
                </a>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{r.summary}</p>
              {r.rejectedReason && <p className="text-xs text-destructive">Reason: {r.rejectedReason}</p>}
              {r.decidedBy && tab !== "pending" && <p className="text-xs text-muted-foreground">By {r.decidedBy} · {fmtDate(r.decidedAt)}</p>}

              <div className="flex flex-wrap gap-2">
                {tab === "pending" && (
                  <>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy === r.id} onClick={() => guard(r.id, () => approve({ id: r._id as Id<"bookReviews"> }))}>
                      <Check className="h-4 w-4 mr-1.5" /> Approve & publish
                    </Button>
                    <Button variant="outline" disabled={busy === r.id} onClick={() => setDeclineId(r.id)}>
                      <X className="h-4 w-4 mr-1.5" /> Decline
                    </Button>
                  </>
                )}
                {tab === "approved" && r.shareToken && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => copyLink(r.shareToken!, r.id)}>
                      <Copy className="h-4 w-4 mr-1.5" /> {copied === r.id ? "Copied" : "Copy link"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(whatsappText(reviewShareText({ bookTitle: book?.title ?? "", kidName: kid?.name ?? "", summary: r.summary, token: r.shareToken! })), "_blank")}>
                      <MessageCircle className="h-4 w-4 mr-1.5 text-emerald-500" /> Share
                    </Button>
                    <Button size="sm" variant="ghost" asChild><a href={`/review/${r.shareToken}`} target="_blank" rel="noreferrer">Open page</a></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeclineId(r.id)}>Take down</Button>
                  </>
                )}
                {tab === "rejected" && (
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => guard(r.id, () => approve({ id: r._id as Id<"bookReviews"> }))}>Approve anyway</Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!declineId} onOpenChange={(o) => !o && setDeclineId(null)}>
        <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline or take down?</DialogTitle>
            <DialogDescription>Add a reason for the teacher (optional).</DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" maxLength={200} />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setDeclineId(null)}>Back</Button>
            <Button
              variant="destructive"
              disabled={busy === declineId}
              onClick={() =>
                guard(declineId!, async () => {
                  await reject({ id: declineId as Id<"bookReviews">, reason });
                  setDeclineId(null);
                  setReason("");
                })
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
