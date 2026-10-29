import { useMutation, useQuery } from "convex/react";
import { Check, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Empty, Panel, fmtDateTime } from "@/components/admin-app/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkBar } from "@/components/admin-app/BulkBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { friendlyError } from "@/lib/friendly-error";
import { useStore } from "@/lib/mock-store";

type Member = NonNullable<ReturnType<typeof useMembers>>[number];
const useMembers = () => useQuery(api.members.list);

function Avatar({ m }: { m: Member }) {
  return m.imageUrl ? (
    <img src={m.imageUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
  ) : (
    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">{(m.name ?? m.email ?? "?").slice(0, 1).toUpperCase()}</div>
  );
}

/** Approve someone as a teacher: link them to a teacher you already added, or create the teacher record now. */
function ApproveTeacherDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const s = useStore();
  const approve = useMutation(api.members.approve);
  const members = useMembers() ?? [];
  const [mode, setMode] = useState<"create" | "link">("create");
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shownFor, setShownFor] = useState<string | null>(null);

  const linked = useMemo(() => new Set(members.map((x) => x.teacherId).filter(Boolean)), [members]);
  const free = s.teachers.filter((t) => !linked.has(t.id as Id<"teachers">) || t.id === member?.teacherId);

  // reset the form each time it opens for a different person
  if (member && shownFor !== member.userId) {
    setShownFor(member.userId);
    setName(member.name ?? "");
    setDept("");
    setPhone("");
    setError("");
    if (member.suggestedTeacherId) {
      setMode("link");
      setLink(member.suggestedTeacherId);
    } else {
      setMode(free.length > 0 && member.teacherId ? "link" : "create");
      setLink(member.teacherId ?? "");
    }
  }
  if (!member) return null;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (mode === "link") {
        if (!link) throw new Error("Choose a teacher.");
        await approve({ userId: member.userId, as: "teacher", teacherId: link as Id<"teachers"> });
      } else {
        await approve({ userId: member.userId, as: "teacher", create: { name, department: dept || undefined, phone: phone || undefined } });
      }
      setShownFor(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error && !(e as { data?: unknown }).data ? e.message : friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve {member.name ?? "this person"} as a teacher</DialogTitle>
          <DialogDescription>{member.email}. They will be able to use the teacher app straight away.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <button onClick={() => setMode("create")} className={`rounded-lg border px-3 py-2 ${mode === "create" ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}>New teacher</button>
          <button onClick={() => setMode("link")} className={`rounded-lg border px-3 py-2 ${mode === "link" ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted"}`}>Already on my list</button>
        </div>

        {mode === "create" ? (
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Teacher name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label className="mb-1.5 block">Class / department (optional)</Label>
              <Select value={dept || "none"} onValueChange={(v) => setDept(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No class yet" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No class yet (assign later)</SelectItem>{s.departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">They can sign in and use the app now. Give them a class later on the Teachers page.</p>
            </div>
            <div>
              <Label className="mb-1.5 block">Phone (optional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={30} />
            </div>
          </div>
        ) : (
          <div>
            <Label className="mb-1.5 block">Which teacher is this?</Label>
            <Select value={link} onValueChange={setLink}>
              <SelectTrigger><SelectValue placeholder={free.length ? "Choose a teacher" : "No unlinked teachers"} /></SelectTrigger>
              <SelectContent>{free.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} · {t.department}</SelectItem>)}</SelectContent>
            </Select>
            {member.suggestedTeacherName && <p className="text-xs text-emerald-600 mt-1.5">Same email as {member.suggestedTeacherName}.</p>}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || (mode === "create" ? !name.trim() : !link)} onClick={submit}>{busy ? "Saving..." : "Approve teacher"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PeoplePanel() {
  const members = useMembers();
  const requests = useQuery(api.admins.listRequests) ?? [];
  const approve = useMutation(api.members.approve);
  const approveMany = useMutation(api.members.approveMany);
  const deny = useMutation(api.members.deny);
  const makeAdmin = useMutation(api.members.makeAdmin);
  const removeAdmin = useMutation(api.members.removeAdmin);
  const [q, setQ] = useState("");
  const [teacherFor, setTeacherFor] = useState<Member | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      alert(friendlyError(e));
    }
  };

  const pending = (members ?? []).filter((m) => m.access === "pending");
  const team = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (members ?? []).filter((m) => (m.access === "admin" || m.access === "approved") && (!s || (m.name ?? "").toLowerCase().includes(s) || (m.email ?? "").toLowerCase().includes(s)));
  }, [members, q]);
  const denied = (members ?? []).filter((m) => m.access === "denied");
  const chosen = pending.filter((m) => picked.has(m.userId));
  const approveChosen = async () => {
    setBulkBusy(true);
    try {
      const res = await approveMany({ userIds: chosen.map((m) => m.userId) });
      setPicked(new Set());
      if (res.skipped > 0) alert(`${res.approved} approved. ${res.skipped} not approved (they asked to be an admin, or were removed). Approve those one by one.`);
    } catch (e) {
      alert(friendlyError(e));
    } finally {
      setBulkBusy(false);
    }
  };
  const hasAdminRequest = (userId: string) => requests.some((r) => r.userId === userId);

  return (
    <div className="space-y-6">
      <Panel title={`Waiting for approval (${pending.length})`}>
        {pending.length > 1 && (
          <BulkBar total={pending.length} selected={chosen.length} busy={bulkBusy} label="Approve as teachers" onToggleAll={() => setPicked(chosen.length === pending.length ? new Set() : new Set(pending.map((m) => m.userId)))} onApprove={approveChosen} />
        )}
        {members === undefined ? (
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        ) : pending.length === 0 ? (
          <Empty>Nobody is waiting. New people appear here the first time they sign in.</Empty>
        ) : (
          <ul className="divide-y">
            {pending.map((m) => (
              <li key={m._id} className="py-3 space-y-2.5">
                <div className="flex items-center gap-3">
                  {pending.length > 1 && (
                    <Checkbox checked={picked.has(m.userId)} aria-label={`Select ${m.name ?? "this person"}`} onCheckedChange={() => setPicked((p) => { const n = new Set(p); n.has(m.userId) ? n.delete(m.userId) : n.add(m.userId); return n; })} />
                  )}
                  <Avatar m={m} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.name ?? "Unknown name"}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email ?? m.userId} · {fmtDateTime(m.createdAt)}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline">Wants to join as {m.role === "admin" || hasAdminRequest(m.userId) ? "an admin" : "a teacher"}</Badge>
                      {m.suggestedTeacherName && <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Matches teacher: {m.suggestedTeacherName}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setTeacherFor(m)}>
                    <Check className="h-4 w-4 mr-1.5" /> Approve as teacher
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => run(() => approve({ userId: m.userId, as: "admin" }))}>
                    <ShieldCheck className="h-4 w-4 mr-1.5" /> Approve as admin
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => run(() => deny({ userId: m.userId }))}>
                    <X className="h-4 w-4 mr-1.5" /> Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`Teachers & admins (${team.length})`}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" className="mb-3" />
        {members !== undefined && team.length === 0 ? (
          <Empty>No one yet.</Empty>
        ) : (
          <ul className="divide-y">
            {team.map((m) => (
              <li key={m._id} className="py-3 flex flex-wrap items-center gap-3">
                <Avatar m={m} />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="text-sm font-medium truncate">
                    {m.name ?? "Unknown name"}
                    {m.isYou && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.email ?? m.userId}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {m.isAdmin && <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Admin</Badge>}
                    {!m.isAdmin && <Badge variant="secondary">Teacher</Badge>}
                    {m.teacherName && <Badge variant="outline">{m.teacherName}</Badge>}
                    {m.fromServerSetting && <Badge variant="outline">Server setting</Badge>}
                  </div>
                </div>
                {!m.isYou && !m.fromServerSetting && (
                  <div className="flex flex-wrap gap-2">
                    {m.isAdmin ? (
                      <Button size="sm" variant="outline" onClick={() => confirm(`Make ${m.name ?? "this person"} a normal teacher?`) && run(() => removeAdmin({ userId: m.userId }))}>Remove admin</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => run(() => makeAdmin({ userId: m.userId }))}>Make admin</Button>
                    )}
                    {!m.teacherName && !m.isAdmin && <Button size="sm" variant="outline" onClick={() => setTeacherFor(m)}>Link teacher</Button>}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Remove ${m.name ?? "this person"}'s access?`) && run(() => deny({ userId: m.userId }))}>Remove access</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {denied.length > 0 && (
        <Panel title={`No access (${denied.length})`}>
          <ul className="divide-y">
            {denied.map((m) => (
              <li key={m._id} className="py-3 flex items-center gap-3">
                <Avatar m={m} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.name ?? "Unknown name"}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email ?? m.userId}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setTeacherFor(m)}>Approve</Button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <ApproveTeacherDialog member={teacherFor} onClose={() => setTeacherFor(null)} />
    </div>
  );
}
