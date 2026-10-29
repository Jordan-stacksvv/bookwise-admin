"use strict";
/**
 * 14 - Teachers can sign in with no class (assign it later), admin gets Books / Kids / Teachers pages,
 *      teacher-added books wait for the admin, and the admin can approve many things at once.
 */
const { load, has, replaceOnce, run } = require("./_lib.cjs");
const { createFrom, L } = require("./_files.cjs");

const DIR = "files14";

run("14 bulk approval + admin pages", () => {
  if (has(load("convex/books.ts"), "export const approveMany")) return "skip";
  const schema = load("convex/schema.ts");

  createFrom(DIR, "src/components/admin-app/BulkBar.tsx");
  createFrom(DIR, "src/components/admin-app/PendingBooks.tsx");
  createFrom(DIR, "src/routes/admin/books.tsx");
  createFrom(DIR, "src/routes/admin/kids.tsx");
  createFrom(DIR, "src/routes/admin/teachers.tsx");

  // ================= backend =================
  replaceOnce(
    schema,
    L('    price: v.optional(v.number()), // replacement cost; falls back to the default damage fee', '  }).index("by_code", ["code"]),'),
    L(
      '    price: v.optional(v.number()), // replacement cost; falls back to the default damage fee',
      "    // A book a teacher adds waits for the admin. No status means live (admin-added and older books).",
      '    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),',
      "    addedBy: v.optional(v.string()),",
      "    rejectedReason: v.optional(v.string()),",
      '  }).index("by_code", ["code"]),',
    ),
    "schema books",
  );

  // ---- books
  const books = load("convex/books.ts");
  replaceOnce(books, 'import { logEvent } from "./activity";', L('import { logEvent } from "./activity";', 'import { getAdmin, requireAdmin } from "./adminAuth";'), "books import");
  replaceOnce(
    books,
    L(
      '    const id = await ctx.db.insert("books", code ? { ...rest, code } : rest);',
      '    await logEvent(ctx, "book.add", `Added book "${args.title}"${code ? ` (${code})` : ""}`, { entity: "book", entityId: id });',
    ),
    L(
      "    const who = await getAdmin(ctx);",
      "    const base = code ? { ...rest, code } : rest;",
      "    // Admin-added books are live at once. A teacher's new book waits for the admin.",
      '    const id = await ctx.db.insert("books", who.isAdmin ? base : { ...base, status: "pending" as const, addedBy: who.name ?? who.email ?? "A teacher" });',
      '    await logEvent(ctx, "book.add", `Added book "${args.title}"${code ? ` (${code})` : ""}${who.isAdmin ? "" : ", waiting for admin approval"}`, { entity: "book", entityId: id });',
    ),
    "books add",
  );
  replaceOnce(
    books,
    L("    await ctx.db.patch(id, updates);", "    const edited = await ctx.db.get(id);"),
    L(
      "    const before = await ctx.db.get(id);",
      "    const editor = await getAdmin(ctx);",
      "    // A teacher fixing a declined book sends it back for approval.",
      '    const resubmit = !editor.isAdmin && before?.status === "rejected";',
      '    await ctx.db.patch(id, resubmit ? { ...updates, status: "pending" as const, rejectedReason: undefined } : updates);',
      "    const edited = await ctx.db.get(id);",
    ),
    "books edit",
  );
  books.text =
    books.text.replace(/\s*$/, "\n") +
    `
/** Admin: let a teacher's book go live. */
export const approve = mutation({
  args: { id: v.id("books") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const b = await ctx.db.get(id);
    if (!b) throw new ConvexError("Book not found.");
    await ctx.db.patch(id, { status: "approved" as const, rejectedReason: undefined });
    await logEvent(ctx, "book.approved", \`Approved book "\${b.title}"\`, { entity: "book", entityId: id });
  },
});

/** Admin: approve several waiting books in one go. */
export const approveMany = mutation({
  args: { ids: v.array(v.id("books")) },
  handler: async (ctx, { ids }) => {
    await requireAdmin(ctx);
    let done = 0;
    for (const id of new Set(ids)) {
      const b = await ctx.db.get(id);
      if (!b || (b.status !== "pending" && b.status !== "rejected")) continue;
      await ctx.db.patch(id, { status: "approved" as const, rejectedReason: undefined });
      await logEvent(ctx, "book.approved", \`Approved book "\${b.title}"\`, { entity: "book", entityId: id });
      done++;
    }
    return { approved: done };
  },
});

/** Admin: decline a teacher's book, with a reason the teacher can see. */
export const reject = mutation({
  args: { id: v.id("books"), reason: v.optional(v.string()) },
  handler: async (ctx, { id, reason }) => {
    await requireAdmin(ctx);
    const b = await ctx.db.get(id);
    if (!b) throw new ConvexError("Book not found.");
    await ctx.db.patch(id, { status: "rejected" as const, rejectedReason: reason?.trim().slice(0, 200) || undefined });
    await logEvent(ctx, "book.declined", \`Declined book "\${b.title}"\${reason?.trim() ? \`: \${reason.trim().slice(0, 100)}\` : ""}\`, { entity: "book", entityId: id });
  },
});
`;

  // ---- a waiting or declined book cannot be given out
  const asg = load("convex/assignments.ts");
  replaceOnce(
    asg,
    L('    if (!book) throw new ConvexError("Book not found.");', "    // New loans wait for the parent"),
    L(
      '    if (!book) throw new ConvexError("Book not found.");',
      '    if (book.status === "pending" || book.status === "rejected") throw new ConvexError("This book is waiting for the admin\'s approval, so it cannot be given out yet.");',
      "    // New loans wait for the parent",
    ),
    "assign guard",
  );

  // ---- members: sign-in without a class, approve many
  const mem = load("convex/members.ts");
  replaceOnce(
    mem,
    L("        department: v.string(),", "        className: v.optional(v.string()),", "        phone: v.optional(v.string()),"),
    L("        department: v.optional(v.string()),", "        className: v.optional(v.string()),", "        phone: v.optional(v.string()),"),
    "members create dept optional",
  );
  replaceOnce(mem, '        if (!create.department.trim()) throw new ConvexError("Choose a class.");\n', "", "members dept check");
  replaceOnce(mem, "          department: create.department.trim(),", '          department: create.department?.trim() || "Unassigned", // the admin gives them a class later', "members dept value");
  mem.text =
    mem.text.replace(/\s*$/, "\n") +
    `
/**
 * Approve many waiting people as teachers at once. Each one is linked to the teacher with the same email if
 * there is one, otherwise a teacher record is created with no class yet (set it later on the Teachers page).
 * People who asked to be admins are skipped: admin rights are always a deliberate, single approval.
 */
export const approveMany = mutation({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, { userIds }) => {
    const who = await requireAdmin(ctx);
    const by = who.name ?? who.email ?? "Admin";
    const now = new Date().toISOString();
    const [members, teachers, adminRows, requests] = await Promise.all([
      ctx.db.query("members").collect(),
      ctx.db.query("teachers").collect(),
      ctx.db.query("admins").collect(),
      ctx.db.query("adminRequests").collect(),
    ]);
    const taken = new Set(members.map((m) => m.teacherId).filter(Boolean) as string[]);
    const wantsAdmin = new Set(requests.map((r) => r.userId));
    const isAdmin = new Set([...adminRows.map((r) => r.userId), ...envIds()]);
    let approved = 0;
    let skipped = 0;
    for (const userId of new Set(userIds)) {
      const m = members.find((x) => x.userId === userId);
      if (!m || m.status === "approved" || isAdmin.has(userId) || isAdmin.has(userId.toLowerCase())) continue;
      if (m.status === "denied" || m.role === "admin" || wantsAdmin.has(userId)) {
        skipped++;
        continue;
      }
      const email = m.email?.trim().toLowerCase();
      const match = email ? teachers.find((t) => t.email?.trim().toLowerCase() === email && !taken.has(t._id)) : undefined;
      let link = match?._id;
      if (!link) {
        link = await ctx.db.insert("teachers", { name: clean(m.name, 80) ?? clean(m.email, 80) ?? "New teacher", department: "Unassigned", email: m.email });
      }
      taken.add(link);
      await ctx.db.patch(m._id, { status: "approved", approvedAt: now, approvedBy: by, teacherId: link });
      await logEvent(ctx, "member.approved", \`Approved \${m.name ?? m.email ?? "someone"} as teacher\`, { entity: "member", entityId: userId });
      approved++;
    }
    return { approved, skipped };
  },
});
`;

  // ---- loans: approve many
  const loans = load("convex/loans.ts");
  loans.text =
    loans.text.replace(/\s*$/, "\n") +
    `
/** Admin final approval for several loans at once (only those the parent has already approved). */
export const adminApproveMany = mutation({
  args: { ids: v.array(v.id("assignments")) },
  handler: async (ctx, { ids }) => {
    const who = await requireAdmin(ctx);
    let done = 0;
    for (const id of new Set(ids)) {
      const a = await ctx.db.get(id);
      if (!a || a.returnedAt || a.status !== "pending_admin") continue;
      await ctx.db.patch(id, { status: "approved", adminApprovedAt: now(), adminApprovedBy: who.name ?? who.email ?? "Admin" });
      await logEvent(ctx, "loan.admin_approved", \`Final approval: \${await loanLabel(ctx, id)}\`, { entity: "loan", entityId: id });
      done++;
    }
    return { approved: done };
  },
});
`;

  // ---- reviews: approve many
  const rv = load("convex/reviews.ts");
  rv.text =
    rv.text.replace(/\s*$/, "\n") +
    `
/** Admin: publish several waiting reviews at once. */
export const approveMany = mutation({
  args: { ids: v.array(v.id("bookReviews")) },
  handler: async (ctx, { ids }) => {
    const who = await requireAdmin(ctx);
    let done = 0;
    for (const id of new Set(ids)) {
      const r = await ctx.db.get(id);
      if (!r || r.status !== "pending") continue;
      await ctx.db.patch(id, {
        status: "approved",
        shareToken: r.shareToken ?? newToken().slice(0, 32),
        decidedAt: new Date().toISOString(),
        decidedBy: who.name ?? who.email ?? "Admin",
        rejectedReason: undefined,
      });
      await logEvent(ctx, "review.approved", \`Review published: \${await kidBookLabel(ctx, r.kidId, r.bookId)}\`, { entity: "review", entityId: id });
      done++;
    }
    return { approved: done };
  },
});
`;

  // ================= frontend =================
  // Book type
  const store = load("src/lib/mock-store.ts");
  replaceOnce(
    store,
    L("  price?: number;", "  issues: BookIssue[];", "};"),
    L("  price?: number;", '  status?: "pending" | "approved" | "rejected"; // empty = live', "  addedBy?: string;", "  rejectedReason?: string;", "  issues: BookIssue[];", "};"),
    "Book type",
  );

  // books page: reusable in the admin app, status badge, no assigning of unapproved books
  const bp = load("src/routes/_authenticated/books.tsx");
  replaceOnce(bp, "function BooksPage() {", "export function BooksPage() {", "books export");
  replaceOnce(bp, 'const search = useSearch({ from: "/_authenticated/books" });', 'const search = useSearch({ strict: false }) as { focus?: string };', "books search");
  replaceOnce(bp, 'import { friendlyError } from "@/lib/friendly-error";', L('import { friendlyError } from "@/lib/friendly-error";', 'import { useAdmin } from "@/hooks/use-admin";'), "books useAdmin import");
  replaceOnce(bp, "  const [reviewsFor, setReviewsFor] = useState<Book | null>(null);", L("  const [reviewsFor, setReviewsFor] = useState<Book | null>(null);", '  const isAdmin = useAdmin().status === "admin";'), "books isAdmin");
  replaceOnce(
    bp,
    L("                            {b.code && <span className=\"font-mono\">{b.code} · </span>}", "                            {b.author}", "                          </p>"),
    L(
      "                            {b.code && <span className=\"font-mono\">{b.code} · </span>}",
      "                            {b.author}",
      "                          </p>",
      '                          {b.status === "pending" && <p className="text-xs text-amber-600 dark:text-amber-400">Waiting for admin approval</p>}',
      '                          {b.status === "rejected" && <p className="text-xs text-destructive">Declined{b.rejectedReason ? `: ${b.rejectedReason}` : ""}. Edit it to send it again.</p>}',
    ),
    "books status text",
  );
  replaceOnce(
    bp,
    "disabled={avail === 0} onClick={() => { setAssignFor(b);",
    'disabled={avail === 0 || b.status === "pending" || b.status === "rejected"} onClick={() => { setAssignFor(b);',
    "books assign disabled",
  );
  replaceOnce(
    bp,
    L('            <DialogTitle>{editing ? "Edit Book" : "Add a Book"}</DialogTitle>', "          </DialogHeader>"),
    L(
      '            <DialogTitle>{editing ? "Edit Book" : "Add a Book"}</DialogTitle>',
      "          </DialogHeader>",
      '          {!editing && !isAdmin && <p className="text-sm text-muted-foreground -mt-1">New books are checked by the admin before they can be given out.</p>}',
    ),
    "books add note",
  );

  // kids + teachers pages: reusable in the admin app
  const kp = load("src/routes/_authenticated/kids.tsx");
  replaceOnce(kp, "function KidsPage() {", "export function KidsPage() {", "kids export");
  replaceOnce(kp, 'const search = useSearch({ from: "/_authenticated/kids" });', 'const search = useSearch({ strict: false }) as { focus?: string };', "kids search");

  const tp = load("src/routes/_authenticated/teachers.tsx");
  replaceOnce(tp, "function TeachersPage() {", "export function TeachersPage() {", "teachers export");
  replaceOnce(tp, 'const search = useSearch({ from: "/_authenticated/teachers" });', 'const search = useSearch({ strict: false }) as { focus?: string };', "teachers search");
  replaceOnce(
    tp,
    "    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));",
    '    // Teachers with no class yet come first so they are easy to assign.\n    return Array.from(map.entries()).sort((a, b) => (a[0] === "Unassigned" ? -1 : b[0] === "Unassigned" ? 1 : a[0].localeCompare(b[0])));',
    "teachers sort",
  );
  replaceOnce(
    tp,
    L("    if (!form.name.trim() || !form.department.trim()) return;", "    if (editing) api.editTeacher(editing.id, form);", "    else api.addTeacher(form);"),
    L(
      "    if (!form.name.trim()) return;",
      '    const data = { ...form, department: form.department.trim() || "Unassigned" }; // a class can be set later',
      "    if (editing) api.editTeacher(editing.id, data);",
      "    else api.addTeacher(data);",
    ),
    "teachers submit",
  );
  replaceOnce(tp, '<Label className="mb-1.5 block">Department / class</Label>', '<Label className="mb-1.5 block">Department / class (optional, can be set later)</Label>', "teachers label");

  // admin app: people - class optional + approve selected
  const pp = load("src/components/admin-app/PeoplePanel.tsx");
  replaceOnce(pp, 'import { Label } from "@/components/ui/label";', L('import { Label } from "@/components/ui/label";', 'import { Checkbox } from "@/components/ui/checkbox";', 'import { BulkBar } from "@/components/admin-app/BulkBar";'), "people imports");
  replaceOnce(
    pp,
    L(
      '              <Label className="mb-1.5 block">Class / department</Label>',
      "              <Select value={dept} onValueChange={setDept}>",
      '                <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>',
      "                <SelectContent>{s.departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>",
      "              </Select>",
    ),
    L(
      '              <Label className="mb-1.5 block">Class / department (optional)</Label>',
      '              <Select value={dept || "none"} onValueChange={(v) => setDept(v === "none" ? "" : v)}>',
      '                <SelectTrigger><SelectValue placeholder="No class yet" /></SelectTrigger>',
      '                <SelectContent><SelectItem value="none">No class yet (assign later)</SelectItem>{s.departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>',
      "              </Select>",
      '              <p className="text-xs text-muted-foreground mt-1.5">They can sign in and use the app now. Give them a class later on the Teachers page.</p>',
    ),
    "people dept optional",
  );
  replaceOnce(pp, "create: { name, department: dept, phone: phone || undefined }", "create: { name, department: dept || undefined, phone: phone || undefined }", "people create payload");
  replaceOnce(pp, "(mode === \"create\" ? !name.trim() || !dept : !link)", '(mode === "create" ? !name.trim() : !link)', "people disabled");
  replaceOnce(pp, "  const approve = useMutation(api.members.approve);\n  const deny", "  const approve = useMutation(api.members.approve);\n  const approveMany = useMutation(api.members.approveMany);\n  const deny", "people approveMany hook");
  replaceOnce(
    pp,
    '  const [teacherFor, setTeacherFor] = useState<Member | null>(null);\n\n  const run',
    L(
      "  const [teacherFor, setTeacherFor] = useState<Member | null>(null);",
      "  const [picked, setPicked] = useState<Set<string>>(new Set());",
      "  const [bulkBusy, setBulkBusy] = useState(false);",
      "",
      "  const run",
    ),
    "people state",
  );
  replaceOnce(
    pp,
    '  const denied = (members ?? []).filter((m) => m.access === "denied");',
    L(
      '  const denied = (members ?? []).filter((m) => m.access === "denied");',
      "  const chosen = pending.filter((m) => picked.has(m.userId));",
      "  const approveChosen = async () => {",
      "    setBulkBusy(true);",
      "    try {",
      "      const res = await approveMany({ userIds: chosen.map((m) => m.userId) });",
      "      setPicked(new Set());",
      '      if (res.skipped > 0) alert(`${res.approved} approved. ${res.skipped} not approved (they asked to be an admin, or were removed). Approve those one by one.`);',
      "    } catch (e) {",
      "      alert(friendlyError(e));",
      "    } finally {",
      "      setBulkBusy(false);",
      "    }",
      "  };",
    ),
    "people bulk fn",
  );
  replaceOnce(
    pp,
    L("      <Panel title={`Waiting for approval (${pending.length})`}>", "        {members === undefined ? ("),
    L(
      "      <Panel title={`Waiting for approval (${pending.length})`}>",
      "        {pending.length > 1 && (",
      '          <BulkBar total={pending.length} selected={chosen.length} busy={bulkBusy} label="Approve as teachers" onToggleAll={() => setPicked(chosen.length === pending.length ? new Set() : new Set(pending.map((m) => m.userId)))} onApprove={approveChosen} />',
      "        )}",
      "        {members === undefined ? (",
    ),
    "people bulk bar",
  );
  replaceOnce(
    pp,
    L('              <li key={m._id} className="py-3 space-y-2.5">', '                <div className="flex items-center gap-3">', "                  <Avatar m={m} />"),
    L(
      '              <li key={m._id} className="py-3 space-y-2.5">',
      '                <div className="flex items-center gap-3">',
      "                  {pending.length > 1 && (",
      '                    <Checkbox checked={picked.has(m.userId)} aria-label={`Select ${m.name ?? "this person"}`} onCheckedChange={() => setPicked((p) => { const n = new Set(p); n.has(m.userId) ? n.delete(m.userId) : n.add(m.userId); return n; })} />',
      "                  )}",
      "                  <Avatar m={m} />",
    ),
    "people checkbox",
  );

  // admin approvals (loans)
  const ap = load("src/routes/admin/approvals.tsx");
  replaceOnce(ap, 'import { Button } from "@/components/ui/button";', L('import { Button } from "@/components/ui/button";', 'import { Checkbox } from "@/components/ui/checkbox";', 'import { BulkBar } from "@/components/admin-app/BulkBar";'), "approvals imports");
  replaceOnce(
    ap,
    "  const reject = useMutation(api.loans.adminReject);",
    L("  const reject = useMutation(api.loans.adminReject);", "  const approveMany = useMutation(api.loans.adminApproveMany);", "  const [picked, setPicked] = useState<Set<string>>(new Set());", "  const [bulkBusy, setBulkBusy] = useState(false);"),
    "approvals hooks",
  );
  replaceOnce(
    ap,
    "  const list = rows[tab];",
    L(
      "  const list = rows[tab];",
      "  const chosen = rows.admin.filter((r) => picked.has(r.a.id));",
      "  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });",
      "  const approveChosen = async () => {",
      "    setBulkBusy(true);",
      "    try {",
      '      await approveMany({ ids: chosen.map((r) => r.a.id as Id<"assignments">) });',
      "      setPicked(new Set());",
      "    } catch (e) {",
      "      alert(friendlyError(e));",
      "    } finally {",
      "      setBulkBusy(false);",
      "    }",
      "  };",
    ),
    "approvals fns",
  );
  replaceOnce(
    ap,
    '      {list.length === 0 ? (\n        <div className="bg-card rounded-xl border"><Empty>{tab === "admin"',
    L(
      '      {tab === "admin" && rows.admin.length > 1 && (',
      '        <BulkBar total={rows.admin.length} selected={chosen.length} busy={bulkBusy} onToggleAll={() => setPicked(chosen.length === rows.admin.length ? new Set() : new Set(rows.admin.map((r) => r.a.id)))} onApprove={approveChosen} />',
      "      )}",
      "",
      '      {list.length === 0 ? (\n        <div className="bg-card rounded-xl border"><Empty>{tab === "admin"',
    ),
    "approvals bar",
  );
  replaceOnce(
    ap,
    '              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">\n                <div className="min-w-0 flex-1">\n                  <p className="font-medium break-words">',
    L(
      '              <div className="flex items-start gap-3">',
      '                {status === "pending_admin" && rows.admin.length > 1 && <Checkbox className="mt-1" checked={picked.has(a.id)} aria-label="Select this loan" onCheckedChange={() => toggle(a.id)} />}',
      '              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">',
      '                <div className="min-w-0 flex-1">',
      '                  <p className="font-medium break-words">',
    ),
    "approvals checkbox open",
  );
  replaceOnce(
    ap,
    L("                <StatusBadge status={status} />", "              </div>"),
    L("                <StatusBadge status={status} />", "              </div>", "              </div>"),
    "approvals checkbox close",
  );

  // admin reviews
  const ar = load("src/routes/admin/reviews.tsx");
  replaceOnce(ar, 'import { Button } from "@/components/ui/button";', L('import { Button } from "@/components/ui/button";', 'import { Checkbox } from "@/components/ui/checkbox";', 'import { BulkBar } from "@/components/admin-app/BulkBar";'), "reviews imports");
  replaceOnce(
    ar,
    "  const reject = useMutation(api.reviews.reject);",
    L("  const reject = useMutation(api.reviews.reject);", "  const approveMany = useMutation(api.reviews.approveMany);", "  const [picked, setPicked] = useState<Set<string>>(new Set());", "  const [bulkBusy, setBulkBusy] = useState(false);"),
    "reviews hooks",
  );
  replaceOnce(
    ar,
    "  const list = rows[tab];",
    L(
      "  const list = rows[tab];",
      "  const chosen = rows.pending.filter((x) => picked.has(x.r.id));",
      "  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });",
      "  const approveChosen = async () => {",
      "    setBulkBusy(true);",
      "    try {",
      '      await approveMany({ ids: chosen.map((x) => x.r._id as Id<"bookReviews">) });',
      "      setPicked(new Set());",
      "    } catch (e) {",
      "      alert(friendlyError(e));",
      "    } finally {",
      "      setBulkBusy(false);",
      "    }",
      "  };",
    ),
    "reviews fns",
  );
  replaceOnce(
    ar,
    '      {list.length === 0 ? (\n        <div className="bg-card rounded-xl border"><Empty>{tab === "pending"',
    L(
      '      {tab === "pending" && rows.pending.length > 1 && (',
      '        <BulkBar total={rows.pending.length} selected={chosen.length} busy={bulkBusy} label="Publish selected" onToggleAll={() => setPicked(chosen.length === rows.pending.length ? new Set() : new Set(rows.pending.map((x) => x.r.id)))} onApprove={approveChosen} />',
      "      )}",
      "",
      '      {list.length === 0 ? (\n        <div className="bg-card rounded-xl border"><Empty>{tab === "pending"',
    ),
    "reviews bar",
  );
  replaceOnce(
    ar,
    L("              <div>", '                <p className="font-display font-semibold break-words">{book?.title ?? "Unknown book"}</p>'),
    L(
      '              <div className="flex items-start gap-3">',
      '                {tab === "pending" && rows.pending.length > 1 && <Checkbox className="mt-1" checked={picked.has(r.id)} aria-label="Select this review" onCheckedChange={() => toggle(r.id)} />}',
      '              <div className="min-w-0 flex-1">',
      '                <p className="font-display font-semibold break-words">{book?.title ?? "Unknown book"}</p>',
    ),
    "reviews checkbox open",
  );
  replaceOnce(
    ar,
    L('                <p className="text-xs text-muted-foreground">Public name: <b>{kid ? shortName(kid.name) : "-"}</b> (first name and last initial only)</p>', "              </div>"),
    L('                <p className="text-xs text-muted-foreground">Public name: <b>{kid ? shortName(kid.name) : "-"}</b> (first name and last initial only)</p>', "              </div>", "              </div>"),
    "reviews checkbox close",
  );

  // admin menu: Books, Kids, Teachers (+ a badge for books waiting)
  const shell = load("src/components/admin-app/AdminShell.tsx");
  replaceOnce(shell, "BookMarked, BookOpenCheck, ScrollText }", "BookMarked, BookOpenCheck, ScrollText, BookOpen, GraduationCap, UsersRound }", "shell icons");
  replaceOnce(
    shell,
    '  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },',
    L(
      '  { to: "/admin/books", label: "Books", icon: BookOpen, badge: "books" },',
      '  { to: "/admin/kids", label: "Kids", icon: UsersRound },',
      '  { to: "/admin/teachers", label: "Teachers", icon: GraduationCap },',
      '  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },',
    ),
    "shell nav",
  );
  replaceOnce(shell, "type Badges = { loans: number; reviews: number; people: number };", "type Badges = { loans: number; reviews: number; people: number; books: number };", "shell badges type");
  replaceOnce(
    shell,
    '    people: (members ?? []).filter((m) => m.access === "pending").length,\n  };\n  const totalWaiting = badges.loans + badges.reviews + badges.people;',
    '    people: (members ?? []).filter((m) => m.access === "pending").length,\n    books: s.books.filter((b) => b.status === "pending").length,\n  };\n  const totalWaiting = badges.loans + badges.reviews + badges.people + badges.books;',
    "shell badges",
  );
  replaceOnce(
    shell,
    'badges.loans > 0 ? "/admin/approvals" : "/admin/reviews"}',
    'badges.loans > 0 ? "/admin/approvals" : badges.reviews > 0 ? "/admin/reviews" : "/admin/books"}',
    "shell top link",
  );
});
