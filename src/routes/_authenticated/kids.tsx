import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore, useApi, isActive, isOverdue, currentAge, type Kid } from "@/lib/mock-store";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Trash2, BookPlus, ChevronDown, RotateCcw, CheckCircle2, Circle } from "lucide-react";
import { Combobox } from "@/components/admin/Combobox";

export const Route = createFileRoute("/_authenticated/kids")({
  component: KidsPage,
  validateSearch: (s: Record<string, unknown>) => ({ focus: typeof s.focus === "string" ? s.focus : undefined }),
});

function KidsPage() {
  const s = useStore();
  const api = useApi();
  const search = useSearch({ from: "/_authenticated/kids" });
  const [openAdd, setOpenAdd] = useState(false);
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [age, setAge] = useState("");
  const [dept, setDept] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Kid | null>(null);
  const [editName, setEditName] = useState("");
  const [editBirth, setEditBirth] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editDept, setEditDept] = useState("");

  useEffect(() => {
    if (search.focus) {
      setExpanded(search.focus);
      requestAnimationFrame(() => {
        document.getElementById(`kid-${search.focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [search.focus]);

  const [assignKidId, setAssignKidId] = useState<string | null>(null);
  const [assignBook, setAssignBook] = useState("");
  const [assignDue, setAssignDue] = useState("");
  const [confirmDel, setConfirmDel] = useState<{ id: string; name: string } | null>(null);

  const submitKid = () => {
    if (!name.trim()) return;
    const computed = birth
      ? currentAge({ id: "", name: "", department: "", age: 0, birthdate: birth })
      : Number(age) || 0;
    api.addKid({ name, age: computed, department: dept, birthdate: birth || undefined });
    setName(""); setBirth(""); setAge(""); setDept(""); setOpenAdd(false);
  };

  const openEdit = (k: Kid) => {
    setEditing(k);
    setEditName(k.name);
    setEditBirth(k.birthdate ?? "");
    setEditAge(String(k.age));
    setEditDept(k.department);
  };

  const saveEdit = () => {
    if (!editing) return;
    const computed = editBirth
      ? currentAge({ id: "", name: "", department: "", age: 0, birthdate: editBirth })
      : Number(editAge) || 0;
    api.editKid(editing.id, {
      name: editName,
      department: editDept,
      age: computed,
      birthdate: editBirth || undefined,
    });
    setEditing(null);
  };

  return (
    <div>
      <PageHeader
        title="Kids"
        subtitle="View profiles, borrowed books, and assignment history."
        actions={<Button onClick={() => setOpenAdd(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Kid</Button>}
      />

      <div className="grid gap-3">
        {s.kids.map((k) => {
          const mine = s.assignments.filter((a) => a.kidId === k.id);
          const active = mine.filter(isActive);
          const isOpen = expanded === k.id;
          const displayAge = currentAge(k);
          return (
            <div
              key={k.id}
              id={`kid-${k.id}`}
              className={`bg-card border rounded-xl overflow-hidden transition ${search.focus === k.id ? "ring-2 ring-primary/40" : ""}`}
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition">
                <button
                  onClick={() => openEdit(k)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-muted/40 transition"
                  aria-label={`Edit ${k.name}`}
                >
                  <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-semibold shrink-0">
                    {k.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{k.name}</p>
                    <p className="text-sm text-muted-foreground truncate">Age {displayAge} · {k.department}</p>
                  </div>
                </button>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {active.length} borrowed
                </span>
                <button
                  onClick={() => setExpanded(isOpen ? null : k.id)}
                  className="p-2 rounded-md hover:bg-muted/60 transition"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              {isOpen && (
                <div className="border-t px-5 py-4 bg-muted/20">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Borrowing history</h4>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setAssignKidId(k.id); setAssignBook(""); setAssignDue(""); }}>
                        <BookPlus className="h-4 w-4 mr-1.5" /> Assign
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDel({ id: k.id, name: k.name })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {mine.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">No assignments yet.</p>
                  ) : (
                    <div className="divide-y">
                      {mine.map((a) => {
                        const book = s.books.find((b) => b.id === a.bookId);
                        const od = isOverdue(a);
                        return (
                          <div key={a.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{book?.title}</p>
                                {a.completed && (
                                  <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" /> Completed
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Due {new Date(a.dueDate).toLocaleDateString()}
                                {a.returnedAt && ` · Returned ${new Date(a.returnedAt).toLocaleDateString()}`}
                                {!a.completed && a.currentPage != null && a.currentPage > 0 && (
                                  <> · Last on page <span className="font-medium text-foreground">{a.currentPage}</span></>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                a.returnedAt ? "bg-muted text-muted-foreground" :
                                od ? "bg-destructive/10 text-destructive" : "bg-accent/20 text-accent-foreground"
                              }`}>
                                {a.returnedAt ? "Returned" : od ? "Overdue" : "Active"}
                              </span>
                              {!a.returnedAt && (
                                <>
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="Page"
                                    value={a.currentPage ?? ""}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      api.updateAssignment(a.id, {
                                        currentPage: v === "" ? undefined : Math.max(0, Number(v)),
                                      });
                                    }}
                                    className="h-8 w-20"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title={a.completed ? "Mark as not completed" : "Mark as completed"}
                                    onClick={() => api.updateAssignment(a.id, { completed: !a.completed })}
                                  >
                                    {a.completed
                                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                      : <Circle className="h-4 w-4" />}
                                  </Button>
                                  <Button size="sm" variant="ghost" title="Mark as returned" onClick={() => api.returnBook(a.id)}>
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a Kid</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label className="mb-1.5 block">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <Label className="mb-1.5 block">Date of birth</Label>
              <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} max={new Date().toISOString().slice(0,10)} />
              <p className="text-xs text-muted-foreground mt-1">
                {birth
                  ? `Age ${currentAge({ id: "", name: "", department: "", age: 0, birthdate: birth })} — updates automatically every year.`
                  : "Recommended — age will increase automatically each year."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Age {birth && <span className="text-xs text-muted-foreground">(auto)</span>}</Label>
                <Combobox
                  inputType="number"
                  value={birth ? String(currentAge({ id: "", name: "", department: "", age: 0, birthdate: birth })) : age}
                  onChange={setAge}
                  options={Array.from(new Set(s.kids.map((k) => k.age))).sort((a, b) => a - b)}
                  placeholder="e.g. 8"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Department</Label>
                <Combobox
                  value={dept}
                  onChange={setDept}
                  options={Array.from(new Set([...s.departments, ...s.kids.map((k) => k.department)]))}
                  placeholder="Select or type…"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button onClick={submitKid}>Add kid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editing?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label className="mb-1.5 block">Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div>
              <Label className="mb-1.5 block">Date of birth</Label>
              <Input type="date" value={editBirth} onChange={(e) => setEditBirth(e.target.value)} max={new Date().toISOString().slice(0,10)} />
              {editBirth && (
                <p className="text-xs text-muted-foreground mt-1">
                  Age {currentAge({ id: "", name: "", department: "", age: 0, birthdate: editBirth })} — updates automatically each year.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Age {editBirth && <span className="text-xs text-muted-foreground">(auto)</span>}</Label>
                <Combobox
                  inputType="number"
                  value={editBirth ? String(currentAge({ id: "", name: "", department: "", age: 0, birthdate: editBirth })) : editAge}
                  onChange={setEditAge}
                  options={Array.from(new Set(s.kids.map((k) => k.age))).sort((a, b) => a - b)}
                  placeholder="e.g. 8"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Department</Label>
                <Combobox
                  value={editDept}
                  onChange={setEditDept}
                  options={Array.from(new Set([...s.departments, ...s.kids.map((k) => k.department)]))}
                  placeholder="Select or type…"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (editing) {
                  setConfirmDel({ id: editing.id, name: editing.name });
                  setEditing(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete kid
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignKidId} onOpenChange={(o) => !o && setAssignKidId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign a book</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-1.5 block">Book</Label>
              <Select value={assignBook} onValueChange={setAssignBook}>
                <SelectTrigger><SelectValue placeholder="Select a book" /></SelectTrigger>
                <SelectContent>
                  {s.books
                    .filter((b) => !s.assignments.some((a) => a.bookId === b.id && isActive(a)))
                    .map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Due date</Label>
              <Input type="date" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignKidId(null)}>Cancel</Button>
            <Button disabled={!assignBook || !assignDue} onClick={() => {
              if (assignKidId) {
                api.assign(assignBook, assignKidId, new Date(assignDue).toISOString());
                setAssignKidId(null);
              }
            }}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {confirmDel?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the kid's profile and all of their borrowing history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDel) api.deleteKid(confirmDel.id);
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