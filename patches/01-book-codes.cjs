"use strict";
/**
 * 01 - Book codes / IDs
 * Adds an optional unique `code` to every book: schema + Convex add/edit
 * (duplicate check), the add/edit form, the books table, and search.
 *
 * Run from project root:  node patches/01-book-codes.cjs
 * Then redeploy Convex:   npx convex deploy --typecheck=disable
 */
const { load, has, replaceOnce, ensureAfter, run } = require("./_lib.cjs");
const { ensureFriendlyError } = require("./_shared.cjs");

run("01 book codes", () => {
  // ---- convex/schema.ts -------------------------------------------------
  const schema = load("convex/schema.ts");
  if (has(schema, "by_code")) return "skip";
  replaceOnce(
    schema,
    `    department: v.string(),
    coverUrl: v.optional(v.string()),
    copies: v.number(),
  }),`,
    `    department: v.string(),
    coverUrl: v.optional(v.string()),
    copies: v.number(),
    code: v.optional(v.string()),
  }).index("by_code", ["code"]),`,
    "books table"
  );

  // ---- convex/books.ts --------------------------------------------------
  const books = load("convex/books.ts");
  replaceOnce(books, `import { v } from "convex/values";`, `import { v, ConvexError } from "convex/values";`, "import");
  replaceOnce(
    books,
    `    copies: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("books", args);
  },`,
    `    copies: v.number(),
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { code: rawCode, ...rest } = args;
    const code = rawCode?.trim();
    if (code) {
      const dup = await ctx.db.query("books").withIndex("by_code", (q) => q.eq("code", code)).first();
      if (dup) throw new ConvexError(\`Book code "\${code}" is already used by "\${dup.title}".\`);
    }
    return await ctx.db.insert("books", code ? { ...rest, code } : rest);
  },`,
    "books.add"
  );
  replaceOnce(
    books,
    `    copies: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, updates);
  },`,
    `    copies: v.optional(v.number()),
    code: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    if (updates.code !== undefined) {
      const code = updates.code.trim();
      if (code) {
        const dup = await ctx.db.query("books").withIndex("by_code", (q) => q.eq("code", code)).first();
        if (dup && dup._id !== id) throw new ConvexError(\`Book code "\${code}" is already used by "\${dup.title}".\`);
      }
      updates.code = code || undefined; // empty string clears the code
    }
    await ctx.db.patch(id, updates);
  },`,
    "books.edit"
  );

  // ---- src/lib/mock-store.ts -------------------------------------------
  const store = load("src/lib/mock-store.ts");
  replaceOnce(store, `  id: string;\n  title: string;\n  author: string;`, `  id: string;\n  code?: string;\n  title: string;\n  author: string;`, "Book type");

  // ---- src/lib/friendly-error.ts (shared) ------------------------------
  ensureFriendlyError();

  // ---- src/routes/_authenticated/books.tsx ------------------------------
  const page = load("src/routes/_authenticated/books.tsx");
  ensureAfter(page, `import { Combobox } from "@/components/admin/Combobox";`, `import { friendlyError } from "@/lib/friendly-error";`);
  replaceOnce(page, `const empty: BookForm = { title: "", author: "",`, `const empty: BookForm = { code: "", title: "", author: "",`, "empty form");
  replaceOnce(page, `setForm({ title: b.title, author: b.author,`, `setForm({ code: b.code ?? "", title: b.title, author: b.author,`, "openEdit");
  replaceOnce(
    page,
    `(b.title.toLowerCase().includes(m) || b.author.toLowerCase().includes(m))`,
    `(b.title.toLowerCase().includes(m) || b.author.toLowerCase().includes(m) || (b.code ?? "").toLowerCase().includes(m))`,
    "search filter"
  );
  replaceOnce(page, `placeholder="Search title or author…"`, `placeholder="Search title, author or code…"`, "search placeholder");
  replaceOnce(
    page,
    `<p className="text-xs text-muted-foreground truncate">{b.author}</p>`,
    `<p className="text-xs text-muted-foreground truncate">
                            {b.code && <span className="font-mono">{b.code} · </span>}
                            {b.author}
                          </p>`,
    "table row"
  );
  replaceOnce(
    page,
    `            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />`,
    `            <Field label="Book code / ID" value={form.code ?? ""} onChange={(v) => setForm({ ...form, code: v })} placeholder="e.g. BK-0001" />
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />`,
    "form field"
  );
  replaceOnce(
    page,
    `  const submit = () => {
    if (!form.title.trim()) return;
    if (editing) api.editBook(editing.id, form);
    else api.addBook(form);
    setOpen(false);
  };`,
    `  const submit = async () => {
    if (!form.title.trim()) return;
    try {
      if (editing) await api.editBook(editing.id, form);
      else await api.addBook(form);
      setOpen(false);
    } catch (e) {
      alert(friendlyError(e));
    }
  };`,
    "submit"
  );

  // ---- src/routes/_authenticated/dashboard.tsx (search box) -------------
  const dash = load("src/routes/_authenticated/dashboard.tsx");
  replaceOnce(
    dash,
    `b.title.toLowerCase().includes(ql) || b.author.toLowerCase().includes(ql)`,
    `b.title.toLowerCase().includes(ql) || b.author.toLowerCase().includes(ql) || (b.code ?? "").toLowerCase().includes(ql)`,
    "dashboard search"
  );
  replaceOnce(dash, `primary: b.title, secondary: b.author,`, `primary: b.title, secondary: [b.code, b.author].filter(Boolean).join(" · "),`, "dashboard result");
});
