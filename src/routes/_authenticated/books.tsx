import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore, useApi, availableCopies, isActive, type Book } from "@/lib/mock-store";
import type { Kid } from "@/lib/mock-store";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, BookPlus, Search, BookOpen, Upload, Tag, Building2, AlertCircle, X, Check } from "lucide-react";
import { Combobox } from "@/components/admin/Combobox";

export const Route = createFileRoute("/_authenticated/books")({
  component: BooksPage,
  validateSearch: (s: Record<string, unknown>) => ({ focus: typeof s.focus === "string" ? s.focus : undefined }),
});

type BookForm = Omit<Book, "id" | "issues">;
const empty: BookForm = { title: "", author: "", category: "", ageRange: "", department: "", coverUrl: "", copies: 1 };

function BooksPage() {
  const s = useStore();
  const api = useApi();
  const search = useSearch({ from: "/_authenticated/books" });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [dept, setDept] = useState("all");
  const [editing, setEditing] = useState<Book | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BookForm>(empty);
  const [assignFor, setAssignFor] = useState<Book | null>(null);
  const [assignKid, setAssignKid] = useState("");
  const [kidQuery, setKidQuery] = useState("");
  const [assignDue, setAssignDue] = useState("");
  const [assignTeacher, setAssignTeacher] = useState<string>("none");
  const [manageOpen, setManageOpen] = useState<null | "category" | "department" | "age">(null);
  const [newValue, setNewValue] = useState("");
  const [issueDraft, setIssueDraft] = useState("");

  const cats = useMemo(
    () => Array.from(new Set([...s.categories, ...s.books.map((b) => b.category)])).filter(Boolean),
    [s.categories, s.books],
  );
  const depts = useMemo(
    () => Array.from(new Set([...s.departments, ...s.books.map((b) => b.department)])).filter(Boolean),
    [s.departments, s.books],
  );
  const ages = useMemo(
    () => Array.from(new Set([...s.ageRanges, ...s.books.map((b) => b.ageRange)])).filter(Boolean),
    [s.ageRanges, s.books],
  );

  const openEdit = (b: Book) => {
    setEditing(b);
    setForm({ title: b.title, author: b.author, category: b.category, ageRange: b.ageRange, department: b.department, coverUrl: b.coverUrl ?? "", copies: b.copies });
    setIssueDraft("");
    setOpen(true);
  };

  // Auto-open book if ?focus= is supplied
  useEffect(() => {
    if (search.focus) {
      const b = s.books.find((x) => x.id === search.focus);
      if (b) openEdit(b);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.focus]);

  const filtered = s.books.filter((b) => {
    const m = q.toLowerCase();
    return (
      (cat === "all" || b.category === cat) &&
      (dept === "all" || b.department === dept) &&
      (b.title.toLowerCase().includes(m) || b.author.toLowerCase().includes(m))
    );
  });

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setIssueDraft("");
    setOpen(true);
  };

  const onCoverFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, coverUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };
  const submit = () => {
    if (!form.title.trim()) return;
    if (editing) api.editBook(editing.id, form);
    else api.addBook(form);
    setOpen(false);
  };

  const editingBook = editing ? s.books.find((b) => b.id === editing.id) : null;

  return (
    <div>
      <PageHeader
        title="Books"
        subtitle="Manage your collection — add, edit, or assign."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => { setManageOpen("category"); setNewValue(""); }}>
              <Tag className="h-4 w-4 mr-1.5" /> Categories
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setManageOpen("department"); setNewValue(""); }}>
              <Building2 className="h-4 w-4 mr-1.5" /> Departments
            </Button>
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1.5" /> Add Book</Button>
          </>
        }
      />

      <div className="bg-card border rounded-xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row gap-3" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title or author…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {depts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 sm:px-4 py-3 font-medium w-14">Cover</th>
                <th className="px-3 sm:px-4 py-3 font-medium">Title</th>
                <th className="px-3 sm:px-4 py-3 font-medium hidden md:table-cell">Category</th>
                <th className="px-3 sm:px-4 py-3 font-medium hidden lg:table-cell">Dept.</th>
                <th className="px-3 sm:px-4 py-3 font-medium">Copies</th>
                <th className="px-3 sm:px-4 py-3 font-medium">Status</th>
                <th className="px-3 sm:px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((b) => {
                const avail = availableCopies(b, s.assignments);
                return (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="h-12 w-9 rounded-md bg-muted overflow-hidden flex items-center justify-center text-muted-foreground border">
                        {b.coverUrl ? (
                          <img src={b.coverUrl} alt={b.title} className="h-full w-full object-cover" />
                        ) : (
                          <BookOpen className="h-4 w-4" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{b.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.author}</p>
                        </div>
                        {b.issues.length > 0 && (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" aria-label={`${b.issues.length} issue(s)`} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 hidden md:table-cell text-muted-foreground">{b.category}</td>
                    <td className="px-3 sm:px-4 py-3 hidden lg:table-cell text-muted-foreground">{b.department}</td>
                    <td className="px-3 sm:px-4 py-3 text-muted-foreground">
                      <span className="tabular-nums">{avail}/{b.copies}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${avail > 0 ? "bg-accent/20 text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                        {avail > 0 ? "Available" : "All out"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" disabled={avail === 0} onClick={() => { setAssignFor(b); setAssignKid(""); setKidQuery(""); setAssignDue(""); }}>
                          <BookPlus className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => api.deleteBook(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No books match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Book" : "Add a Book"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="mb-1.5 block">Cover image</Label>
              <div className="flex items-center gap-3">
                <div className="h-20 w-14 rounded-md bg-muted border overflow-hidden flex items-center justify-center text-muted-foreground shrink-0">
                  {form.coverUrl ? (
                    <img src={form.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <BookOpen className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 grid gap-2 min-w-0">
                  <label className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border bg-card hover:bg-muted/40 cursor-pointer text-sm">
                    <Upload className="h-3.5 w-3.5" /> Upload image
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onCoverFile(e.target.files?.[0])} />
                  </label>
                  <Input placeholder="…or paste an image URL" value={form.coverUrl ?? ""} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} />
                </div>
              </div>
            </div>
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <Field label="Author" value={form.author} onChange={(v) => setForm({ ...form, author: v })} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Category" value={form.category} options={cats} onChange={(v) => setForm({ ...form, category: v })} onAdd={() => { setManageOpen("category"); setNewValue(""); }} />
              <SelectField label="Age Range" value={form.ageRange} options={ages} onChange={(v) => setForm({ ...form, ageRange: v })} onAdd={() => { setManageOpen("age"); setNewValue(""); }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Department" value={form.department} options={depts} onChange={(v) => setForm({ ...form, department: v })} onAdd={() => { setManageOpen("department"); setNewValue(""); }} />
              <div>
                <Label className="mb-1.5 block">Copies</Label>
                <Input type="number" min={1} value={form.copies} onChange={(e) => setForm({ ...form, copies: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
            </div>

            {editingBook && (
              <div className="border-t pt-3 mt-1">
                <Label className="mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" /> Issues / notes
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Log any problems — torn pages, missing cover, etc. Visible every time this book is opened.
                </p>
                {editingBook.issues.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {editingBook.issues.map((i) => (
                      <div key={i.id} className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-md px-2.5 py-1.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground whitespace-pre-wrap break-words">{i.note}</p>
                          <p className="text-muted-foreground mt-0.5">
                            {new Date(i.reportedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button onClick={() => api.removeBookIssue(editingBook.id, i.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    placeholder="Describe an issue…"
                    value={issueDraft}
                    onChange={(e) => setIssueDraft(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!issueDraft.trim()}
                    onClick={() => { api.addBookIssue(editingBook.id, issueDraft); setIssueDraft(""); }}
                  >
                    Log
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Add book"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign “{assignFor?.title}”</DialogTitle></DialogHeader>
          {assignFor && assignFor.issues.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-md p-2.5 text-xs">
              <p className="font-medium text-destructive flex items-center gap-1.5 mb-1"><AlertCircle className="h-3.5 w-3.5" /> Known issues</p>
              <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                {assignFor.issues.map((i) => <li key={i.id}>{i.note}</li>)}
              </ul>
            </div>
          )}
          <div className="grid gap-3">
            <div>
              <Label className="mb-1.5 block">Kid</Label>
              <KidPicker
                kids={s.kids}
                value={assignKid}
                onChange={setAssignKid}
                query={kidQuery}
                onQueryChange={setKidQuery}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Teacher (optional)</Label>
              <Select value={assignTeacher} onValueChange={setAssignTeacher}>
                <SelectTrigger><SelectValue placeholder="Select a teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No teacher</SelectItem>
                  {s.teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} · {t.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">Due date</Label>
              <Input type="date" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button
              disabled={!assignKid || !assignDue}
              onClick={() => {
                if (assignFor) {
                  api.assign(assignFor.id, assignKid, new Date(assignDue).toISOString(), assignTeacher !== "none" ? assignTeacher : undefined);
                  setAssignFor(null);
                  setAssignTeacher("none");
                }
              }}
            >Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!manageOpen} onOpenChange={(o) => !o && setManageOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {manageOpen === "category" && "Manage Categories"}
              {manageOpen === "department" && "Manage Departments"}
              {manageOpen === "age" && "Manage Age Ranges"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="flex gap-2">
              <Input placeholder={manageOpen === "age" ? "e.g. 8-12" : "Name"} value={newValue} onChange={(e) => setNewValue(e.target.value)} autoFocus />
              <Button
                disabled={!newValue.trim()}
                onClick={() => {
                  if (manageOpen === "category") api.addCategory(newValue);
                  else if (manageOpen === "department") api.addDepartment(newValue);
                  else if (manageOpen === "age") api.addAgeRange(newValue);
                  setNewValue("");
                }}
              >Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto">
              {(manageOpen === "category" ? cats : manageOpen === "department" ? depts : ages).map((v) => {
                const inUse = manageOpen === "category"
                  ? s.books.some((b) => b.category === v)
                  : manageOpen === "department"
                    ? s.books.some((b) => b.department === v) || s.kids.some((k) => k.department === v) || s.teachers.some((t) => t.department === v)
                    : s.books.some((b) => b.ageRange === v);
                return (
                  <span key={v} className="inline-flex items-center gap-1 text-xs pl-2.5 pr-1 py-1 rounded-full bg-muted text-muted-foreground">
                    {v}
                    {!inUse && (
                      <button
                        onClick={() => {
                          if (manageOpen === "category") api.deleteCategory(v);
                          else if (manageOpen === "department") api.deleteDepartment(v);
                          else if (manageOpen === "age") api.deleteAgeRange(v);
                        }}
                        className="h-4 w-4 rounded-full hover:bg-destructive/15 hover:text-destructive inline-flex items-center justify-center"
                        title="Delete"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Items currently used by a book, kid, or teacher cannot be deleted.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageOpen(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function SelectField({ label, value, options, onChange, onAdd }: { label: string; value: string; options: string[]; onChange: (v: string) => void; onAdd: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label>{label}</Label>
        <button type="button" onClick={onAdd} className="text-xs text-primary hover:underline">Manage</button>
      </div>
      <Combobox value={value} onChange={onChange} options={options} placeholder={`Select or type ${label.toLowerCase()}…`} />
    </div>
  );
}

void isActive;

function KidPicker({
  kids,
  value,
  onChange,
  query,
  onQueryChange,
}: {
  kids: Kid[];
  value: string;
  onChange: (id: string) => void;
  query: string;
  onQueryChange: (v: string) => void;
}) {
  const selected = kids.find((k) => k.id === value);
  const q = query.trim().toLowerCase();
  const matches = q
    ? kids.filter((k) =>
        [k.name, k.department, String(k.age)].some((f) => f.toLowerCase().includes(q)),
      )
    : kids;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, department, age…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoFocus
        />
      </div>
      {selected && !query && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-2.5 py-1.5 text-sm">
          <span className="truncate"><span className="font-medium">{selected.name}</span> · <span className="text-muted-foreground">{selected.department}</span></span>
          <button onClick={() => onChange("")} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {(query || !selected) && (
        <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
          {matches.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No kids match “{query}”.</p>
          )}
          {matches.slice(0, 50).map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => { onChange(k.id); onQueryChange(""); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-muted/40"
            >
              <span className="min-w-0">
                <span className="font-medium block truncate">{k.name}</span>
                <span className="text-xs text-muted-foreground">{k.department} · age {k.age}</span>
              </span>
              {value === k.id && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
