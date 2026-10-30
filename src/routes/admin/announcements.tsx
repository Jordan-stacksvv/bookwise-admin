import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Empty, Panel, fmtDate } from "@/components/admin-app/ui";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { whatsappShare } from "@/lib/approval-link";
import { friendlyError } from "@/lib/friendly-error";
import { useStore } from "@/lib/mock-store";

export const Route = createFileRoute("/admin/announcements")({
  component: Announcements,
});

function Announcements() {
  const s = useStore();
  const list = useQuery(api.announcements.list) ?? [];
  const create = useMutation(api.announcements.create);
  const remove = useMutation(api.announcements.remove);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<string[]>([]); // empty = everyone
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (c: string) => setAudience((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));

  const post = async () => {
    setError("");
    setBusy(true);
    try {
      await create({ title, body, audience, expiresAt: expires ? new Date(expires + "T23:59:59").toISOString() : undefined });
      setTitle("");
      setBody("");
      setAudience([]);
      setExpires("");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const nowIso = new Date().toISOString();

  return (
    <>
      <PageHeader title="Announcements" />

      <Panel title="New announcement" className="mb-6">
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Book fair this Sabbath" />
          </div>
          <div>
            <Label className="mb-1.5 block">Message</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} placeholder="Write the announcement…" />
          </div>
          <div>
            <Label className="mb-1.5 block">For</Label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAudience([])}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${audience.length === 0 ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              >
                Everyone
              </button>
              {s.departments.map((c) => (
                <button
                  key={c}
                  onClick={() => toggle(c)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${audience.includes(c) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="max-w-xs">
            <Label className="mb-1.5 block">Hide after (optional)</Label>
            <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full sm:w-auto" disabled={busy || !title.trim() || !body.trim()} onClick={post}>{busy ? "Posting..." : "Post announcement"}</Button>
        </div>
      </Panel>

      <Panel title={`Posted (${list.length})`}>
        {list.length === 0 ? (
          <Empty>No announcements yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {list.map((a) => {
              const expired = !!a.expiresAt && a.expiresAt < nowIso;
              const msg = `*${a.title}*\n${a.body}\n\n- Madina Central SDA Book Club`;
              return (
                <li key={a._id} className={`rounded-lg border p-4 ${expired ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-medium break-words">{a.title}</p>
                    {expired && <Badge variant="secondary">Expired</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{a.body}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {a.audience.length === 0 ? <Badge variant="outline">Everyone</Badge> : a.audience.map((c: string) => <Badge key={c} variant="outline">{c}</Badge>)}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(a.createdAt)} · {a.createdBy}{a.expiresAt ? ` · hides ${fmtDate(a.expiresAt)}` : ""}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(whatsappShare(msg), "_blank")}>
                        <MessageCircle className="h-4 w-4 mr-1.5 text-emerald-500" /> Share
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={async () => {
                          if (!confirm("Delete this announcement?")) return;
                          try {
                            await remove({ id: a._id as Id<"announcements"> });
                          } catch (e) {
                            alert(friendlyError(e));
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
