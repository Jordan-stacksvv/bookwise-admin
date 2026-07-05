import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore, useApi, isActive, isOverdue, currentAge, type Kid } from "@/lib/mock-store";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, BookPlus, ChevronDown, RotateCcw, CheckCircle2, Circle, MessageCircle, BookOpenCheck } from "lucide-react";
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
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Kid | null>(null);
  const [editName, setEditName] = useState("");
  const [editBirth, setEditBirth] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");

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
  const [reviewFor, setReviewFor] = useState<{ assignmentId: string; kidId: string; bookId: string } | null>(null);
  const [reviewChapters, setReviewChapters] = useState("");
  const [reviewSummary, setReviewSummary] = useState("");

  const submitKid = () => {
    if (!name.trim()) return;
    const computed = birth
      ? currentAge({ id: "", name: "", department: "", age: 0, birthdate: birth })
      : Number(age) || 0;
    api.addKid({ name, age: computed, department: dept, birthdate: birth || undefined, parentName: parentName || undefined, parentPhone: parentPhone || undefined });
    setName(""); setBirth(""); setAge(""); setDept(""); setParentName(""); setParentPhone(""); setOpenAdd(false);
  };

  const openEdit = (k: Kid) => {
    setEditing(k);
    setEditName(k.name);
    setEditBirth(k.birthdate ?? "");
    setEditAge(String(k.age));
    setEditDept(k.department);
    setEditParentName(k.parentName ?? "");
    setEditParentPhone(k.parentPhone ?? "");
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
      parentName: editParentName || undefined,
      parentPhone: editParentPhone || undefined,
    });
    setEditing(null);
  };

  const submitReview = () => {
    if (!reviewFor || !reviewSummary.trim()) return;
    api.addReview({
      assignmentId: reviewFor.assignmentId,
      kidId: reviewFor.kidId,
      bookId: reviewFor.bookId,
      chapterRange: reviewChapters || undefined,
      summary: reviewSummary,
    });
    setReviewFor(null); setReviewChapters(""); setReviewSummary("");
  };

  const normalisePhone = (raw: string): string | null => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (/^0\d{9}$/.test(digits)) {
      return "233" + digits.slice(1);
    }
    if (/^233\d{9}$/.test(digits)) {
      return digits;
    }
    return null;
  };

  const sendReviewToParent = (kid: Kid, book: any, review: any) => {
    if (!kid.parentPhone) return;
    const phone = normalisePhone(kid.parentPhone);
    if (!phone) { alert("This parent's WhatsApp number doesn't look valid. Please update it in the kid's profile (use 0XXXXXXXXX or +233XXXXXXXXX)."); return; }
    const chapterLine = review.chapterRange ? ` (Chapters ${review.chapterRange})` : "";
    const msg = `Hello ${kid.parentName || "there"}, here's ${kid.name}'s review of "${book?.title}"${chapterLine}:\n\n"${review.summary}"\n\n— sent from the church book club`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    api.markReviewSent(review.id);
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
                          <div key={a.id} className="py-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
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
                                  {k.parentPhone && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Send WhatsApp reminder to parent"
                                      onClick={() => {
                                        const phone = normalisePhone(k.parentPhone!);
                                        if (!phone) { alert("This parent's WhatsApp number doesn't look valid. Please update it in the kid's profile (use 0XXXXXXXXX or +233XXXXXXXXX)."); return; }
                                        const msg = `Hello ${k.parentName || "there"}, this is to let you know that ${k.name} has borrowed "${book?.title}" from the church book club. Please help them return it by ${new Date(a.dueDate).toLocaleDateString()}. Thank you!`;
                                        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                                      }}
                                    >
                                      <MessageCircle className="h-4 w-4 text-emerald-500" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 pl-0 sm:pl-1">
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                              <p className="text-xs font-medium text-muted-foreground">Reviews</p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setReviewFor({ assignmentId: a.id, kidId: k.id, bookId: a.bookId })}
                              >
                                <BookOpenCheck className="h-3.5 w-3.5 mr-1" /> Add review
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {s.reviews.filter((r) => r.assignmentId === a.id).map((r) => (
                                <div key={r.id} className="rounded-lg border bg-muted/30 p-2.5 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    {r.chapterRange && (
                                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Chapters {r.chapterRange}</p>
                                    )}
                                    <p className="text-sm break-words">{r.summary}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(r.createdAt).toLocaleDateString()}
                                      {r.sentToParentAt && ` · Sent to parent ${new Date(r.sentToParentAt).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                  {k.parentPhone && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs shrink-0 self-start"
                                      onClick={() => sendReviewToParent(k, book, r)}
                                    >
                                      <MessageCircle className="h-3.5 w-3.5 mr-1 text-emerald-500" /> Send to parent
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Parent name</Label><Input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Optional" /></div>
              <div><Label className="mb-1.5 block">Parent WhatsApp number</Label><Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="e.g. +233 24 000 0000" /></div>
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Parent name</Label><Input value={editParentName} onChange={(e) => setEditParentName(e.target.value)} placeholder="Optional" /></div>
              <div><Label className="mb-1.5 block">Parent WhatsApp number</Label><Input value={editParentPhone} onChange={(e) => setEditParentPhone(e.target.value)} placeholder="e.g. +233 24 000 0000" /></div>
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

      <Dialog open={!!reviewFor} onOpenChange={(o) => !o && setReviewFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a book review</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-1.5 block">Chapters read (optional)</Label>
              <Input value={reviewChapters} onChange={(e) => setReviewChapters(e.target.value)} placeholder="e.g. 1-4" className="w-full" />
            </div>
            <div>
              <Label className="mb-1.5 block">Summary / review</Label>
              <Textarea value={reviewSummary} onChange={(e) => setReviewSummary(e.target.value)} placeholder="What did they read? What did they think?" className="w-full min-h-[100px]" />
            </div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setReviewFor(null)}>Cancel</Button>
            <Button disabled={!reviewSummary.trim()} onClick={submitReview}>Save review</Button>
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










