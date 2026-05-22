import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore, useApi, type Teacher } from "@/lib/mock-store";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Phone, Mail, GraduationCap } from "lucide-react";
import { Combobox } from "@/components/admin/Combobox";

export const Route = createFileRoute("/_authenticated/teachers")({
  component: TeachersPage,
  validateSearch: (s: Record<string, unknown>) => ({ focus: typeof s.focus === "string" ? s.focus : undefined }),
});

function TeachersPage() {
  const s = useStore();
  const api = useApi();
  const search = useSearch({ from: "/_authenticated/teachers" });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ name: "", department: "", className: "", phone: "", email: "" });
  const [confirmDel, setConfirmDel] = useState<Teacher | null>(null);

  useEffect(() => {
    if (search.focus) {
      requestAnimationFrame(() => {
        document.getElementById(`teacher-${search.focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [search.focus]);

  const grouped = useMemo(() => {
    const map = new Map<string, Teacher[]>();
    for (const t of s.teachers) {
      if (!map.has(t.department)) map.set(t.department, []);
      map.get(t.department)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [s.teachers]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", department: "", className: "", phone: "", email: "" });
    setOpen(true);
  };
  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({ name: t.name, department: t.department, className: t.className ?? "", phone: t.phone ?? "", email: t.email ?? "" });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.department.trim()) return;
    if (editing) api.editTeacher(editing.id, form);
    else api.addTeacher(form);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Teachers"
        subtitle="Department leaders and class teachers in the book club."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Teacher
          </Button>
        }
      />

      {grouped.length === 0 && (
        <div className="bg-card border rounded-xl p-10 text-center text-sm text-muted-foreground">
          No teachers yet. Add one to get started.
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([dept, list]) => {
          const kidCount = s.kids.filter((k) => k.department === dept).length;
          return (
            <section key={dept}>
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {dept}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {list.length} teacher{list.length === 1 ? "" : "s"} · {kidCount} kid
                  {kidCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((t) => (
                  <div
                    key={t.id}
                    id={`teacher-${t.id}`}
                    className={`bg-card border rounded-xl p-4 transition ${search.focus === t.id ? "ring-2 ring-primary/40" : ""}`}
                    style={{ boxShadow: "var(--shadow-soft)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent/30 text-accent-foreground flex items-center justify-center font-display font-semibold">
                        {t.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.department}
                          {t.className ? ` · ${t.className}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setConfirmDel(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {(t.phone || t.email) && (
                      <div className="mt-3 pt-3 border-t space-y-1.5 text-xs text-muted-foreground">
                        {t.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" /> {t.phone}
                          </div>
                        )}
                        {t.email && (
                          <div className="flex items-center gap-2 truncate">
                            <Mail className="h-3 w-3" /> {t.email}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit teacher" : "Add a teacher"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-1.5 block">Full name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Department / class</Label>
              <Combobox
                value={form.department}
                onChange={(v) => setForm({ ...form, department: v })}
                options={Array.from(new Set([...s.teachers.map((t) => t.department), ...s.kids.map((k) => k.department)]))}
                placeholder="e.g. Primary, Juniors"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Class</Label>
              <Combobox
                value={form.className}
                onChange={(v) => setForm({ ...form, className: v })}
                options={Array.from(new Set(s.teachers.map((t) => t.className).filter((c): c is string => !!c)))}
                placeholder="e.g. Lambs, Eagles, Pathfinders"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Add teacher"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.name} will be removed from the {confirmDel?.department} department.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDel) api.deleteTeacher(confirmDel.id);
                setConfirmDel(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
